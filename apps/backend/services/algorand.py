import algosdk
from algosdk.v2client import algod
from algosdk import mnemonic, transaction
from config import settings

class AlgorandService:
    def __init__(self):
        self.algod_client = algod.AlgodClient(
            settings.algorand_algod_token,
            settings.algorand_algod_address
        )
        self.backend_mnemonic = settings.backend_mnemonic

    def _get_private_key(self):
        if not self.backend_mnemonic:
            raise Exception("BACKEND_MNEMONIC not set in environment or config")
        return mnemonic.to_private_key(self.backend_mnemonic)

    def deploy_contract(self, client_wallet: str, payment_algo: float) -> int:
        """This is now handled by the frontend via Pera Wallet. This method is a stub."""
        # In a real decentralised app, the backend shouldn't deploy the contract for the user.
        # But if we were to do it, we'd need the user's private key, which we don't have.
        return 0

    def register_real_contract(self, app_id: int, client_wallet: str) -> None:
        """Placeholder for logging. Persistent state should be in Supabase/Database."""
        print(f"Registered real contract: {app_id} for client: {client_wallet}")

    def post_score(self, app_id: int, score: int):
        """
        Submits the score to the Algorand smart contract.
        Called by the AI Oracle (Backend) after evaluation.
        """
        params = self.algod_client.suggested_params()
        private_key = self._get_private_key()
        sender = algosdk.account.address_from_private_key(private_key)

        # Call the 'score' method: app_args = ["score", score]
        app_args = [
            b"score",
            score.to_bytes(8, 'big')
        ]

        txn = transaction.ApplicationNoOpTxn(
            sender=sender,
            sp=params,
            index=app_id,
            app_args=app_args
        )

        signed_txn = txn.sign(private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        # Wait for confirmation
        transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
        return tx_id

    def release_payment(self, app_id: int) -> str:
        """
        The backend can't call release (it's restricted to the dev in the contract now).
        But if the dev calls it, this method is useful for tracking.
        Actually, let's keep it if we want the backend to trigger release (if contract allowed).
        In the refined kyte.py, on_release checks Txn.sender() == App.globalGet(dev_key).
        So the Developer must sign this.
        """
        return "tx_release_pending_dev_signature"

    def get_contract_state(self, app_id: int):
        """Fetches global state from the Algorand chain."""
        try:
            from types import SimpleNamespace
            app_info = self.algod_client.application_info(app_id)
            global_state = app_info.get("params", {}).get("global-state", [])
            
            # Helper to decode global state
            state = {}
            import base64
            for item in global_state:
                key = base64.b64decode(item["key"]).decode()
                val = item["value"]
                if val["type"] == 1: # bytes
                    state[key] = base64.b64decode(val["bytes"]).decode()
                else: # uint
                    state[key] = val["uint"]
            
            # Map to something the frontend expects
            return SimpleNamespace(
                status_int=state.get("status", 0),
                score=state.get("score", 0),
                client_wallet=state.get("client", ""),
                dev_wallet=state.get("dev", ""),
                submission_url=state.get("submission", ""),
            )
        except Exception as e:
            from types import SimpleNamespace
            print(f"Error fetching contract state: {e}")
            return SimpleNamespace(
                status_int=0, score=0, client_wallet="", dev_wallet="", submission_url=""
            )

algorand_service = AlgorandService()
