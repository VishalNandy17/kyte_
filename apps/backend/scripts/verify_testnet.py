import os
import sys

# Add apps/backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
import algosdk
from algosdk.v2client import algod

def verify():
    print("--- KYTE TestNet Verification ---")
    
    # Check Connectivity
    try:
        client = algod.AlgodClient(
            settings.algorand_algod_token or "", 
            settings.algorand_algod_address,
            headers={"X-API-Key": settings.algorand_algod_token} if settings.algorand_algod_token else {}
        )
        status = client.status()
        print(f"[OK] Connected to Algorand TestNet (Last Round: {status['last-round']})")
    except Exception as e:
        print(f"[ERROR] Failed to connect to node: {e}")
        return

    # Check Backend Mnemonic
    mnemonic = settings.backend_mnemonic
    if not mnemonic:
        print("[ERROR] BACKEND_MNEMONIC is not set in apps/backend/.env")
        return
    
    try:
        pk = algosdk.mnemonic.to_private_key(mnemonic)
        address = algosdk.account.address_from_private_key(pk)
        print(f"[OK] Backend Wallet Address: {address}")
        
        # Check Balance
        account_info = client.account_info(address)
        balance = account_info.get('amount', 0) / 1_000_000
        print(f"[OK] Wallet Balance: {balance} ALGO")
        
        if balance < 1:
            print("[WARNING] Low balance. Please fund the account via TestNet Dispenser.")
    except Exception as e:
        print(f"[ERROR] Invalid mnemonic or account error: {e}")

if __name__ == "__main__":
    # Add apps/backend to path to import config
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    verify()
