import algosdk
from algosdk.v2client import algod
from algosdk import mnemonic, transaction
from config import settings

class BlockchainService:
    def __init__(self):
        self.algod_client = algod.AlgodClient(
            settings.algorand_algod_token,
            settings.algorand_algod_address
        )
        self.backend_mnemonic = settings.backend_mnemonic

    def get_private_key(self):
        if not self.backend_mnemonic:
            raise Exception("BACKEND_MNEMONIC not set in environment or config")
        return mnemonic.to_private_key(self.backend_mnemonic)

    def submit_score(self, app_id: int, score: int):
        """
        Submits the score to the Algorand smart contract.
        Called by the AI Oracle after evaluation.
        """
        params = self.algod_client.suggested_params()
        private_key = self.get_private_key()
        sender = algosdk.account.address_from_private_key(private_key)

        # Call the 'score' method of the application
        # Arguments: ["score", score (as int)]
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
        result = transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
        return tx_id, result

blockchain_service = BlockchainService()
