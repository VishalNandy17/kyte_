from algosdk import account
from algosdk import mnemonic

private_key, address = account.generate_account()

print("Address:", address)
print("Mnemonic:", mnemonic.from_private_key(private_key))