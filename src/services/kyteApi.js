import { signAuthNonce } from "./wallet";

const API_BASE_URL = import.meta.env.VITE_KYTE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "KYTE API request failed");
  }
  return payload;
}

export async function issueKyteToken(address) {
  // 1. Get nonce
  const { nonce } = await request(`/auth/nonce?wallet=${encodeURIComponent(address)}`);
  
  // 2. Sign nonce in frontend
  const signature = await signAuthNonce(address, nonce);
  
  if (!signature) {
    throw new Error("User rejected signing auth nonce");
  }
  
  // 3. Verify and get token
  const result = await request("/auth/verify", {
    method: "POST",
    body: {
      wallet: address,
      nonce: nonce,
      signature: JSON.stringify(signature), // Structuring it for the backend
      role: ["client", "developer"]
    },
  });
  
  return result.token;
}

import algosdk from "algosdk";
import { signTransaction, getAlgodClient, createSubmitTxn } from "./wallet";
import { supabase } from '../supabaseClient';

export async function createProject(token, data, address) {
  // 1. Get compiled TEAL from backend
  const { approval_b64, clear_b64, suggested_params } = await request("/contract/compile");
  
  const client = getAlgodClient();
  const encoder = new TextEncoder();
  
  // 2. Prepare ApplicationCreateTxn
  // appArgs: [amount (as uint64 bytes)]
  const amount = BigInt(Math.floor(data.payment_algo * 1_000_000)); // ALGO to microALGO
  const appArgs = [algosdk.encodeUint64(amount)];

  const onComplete = algosdk.OnComplete.NoOpOC;
  
  const txn = algosdk.makeApplicationCreateTxnFromObject({
      from: address,
      suggestedParams: suggested_params,
      onComplete: onComplete,
      approvalProgram: new Uint8Array(Buffer.from(approval_b64, "base64")),
      clearProgram: new Uint8Array(Buffer.from(clear_b64, "base64")),
      numLocalInts: 0,
      numLocalByteSlices: 0,
      numGlobalInts: 4,
      numGlobalByteSlices: 4,
      appArgs: appArgs,
  });

  // 3. Prepare funding transaction (send ALGO to the app address)
  // Note: We need the appId first to get the app address.
  // In Algorand, we can use a grouped transaction if we know the logic, 
  // but for simplicity, let's create the app then fund it.
  
  const signed = await signTransaction([{ txn, message: "Create KYTE Escrow Smart Contract" }]);
  if (!signed) throw new Error("Transaction rejected by user");

  const { txId } = await client.sendRawTransaction(signed).do();
  const result = await algosdk.waitForConfirmation(client, txId, 4);
  const appId = result['application-index'];

  // 4. Fund the application
  const appAddress = algosdk.getApplicationAddress(appId);
  const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: appAddress,
    amount: amount,
    suggestedParams: suggested_params
  });

  const signedFund = await signTransaction([{ txn: fundTxn, message: `Deposit ${data.payment_algo} ALGO into Escrow` }]);
  if (!signedFund) throw new Error("Funding transaction rejected");
  await client.sendRawTransaction(signedFund).do();

  // 5. Create project record in Supabase with appId
  const projectData = {
    ...data,
    app_id: appId,
    wallet_address: address,
    status: 'OPEN'
  };

  const { data: project, error } = await supabase.functions.invoke('gemini-audit', {
    body: {
      action: 'create',
      geminiApiKey: data.geminiApiKey,
      data: projectData
    }
  });
  
  if (error) throw new Error(error.message || "Failed to sync project to database");
  return project;
}

export async function submitProject(token, data, address) {
  // 1. Sign on-chain submission
  const txns = await createSubmitTxn(address, data.appId, data.githubUrl);
  const signed = await signTransaction(txns);
  if (!signed) throw new Error("Submission transaction rejected");

  const client = getAlgodClient();
  await client.sendRawTransaction(signed).do();

  // 2. Trigger AI Audit
  const { data: result, error } = await supabase.functions.invoke('gemini-audit', {
    body: {
      action: 'submit',
      geminiApiKey: data.geminiApiKey,
      data: {
        ...data,
        developerId: data.developerId,
        developerEmail: data.developerEmail
      }
    }
  });

  if (error) throw new Error(error.message || "Failed to submit project for audit");
  if (result && result.error) throw new Error(result.error);
  return result;
}

export async function getProjectStatus(token, projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function getProjectReport(token, projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('evaluation_result')
    .eq('id', projectId)
    .single();
    
  if (error) throw error;
  return data;
}

