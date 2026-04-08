import json, base64, getpass, os
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

file_path = input("Enter provide the file path: ")

with open(file_path) as f:
    enc = json.load(f)

password = getpass.getpass("Password: ").encode()
salt = base64.b64decode(enc["salt"])
iv   = base64.b64decode(enc["iv"])
ct   = base64.b64decode(enc["ciphertext"])

kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
key = kdf.derive(password)

plaintext = AESGCM(key).decrypt(iv, ct, None)
decrypted_data = json.dumps(json.loads(plaintext), indent=2)

action = input("Do you want to (v)iew the contents or (s)ave to a file? [v/s]: ").strip().lower()

if action == 's':
    directory, filename = os.path.split(file_path)
    new_filename = f"decrypted_{filename}"
    new_filepath = os.path.join(directory, new_filename)
    with open(new_filepath, 'w') as f:
        f.write(decrypted_data)
    print(f"File saved as: {new_filepath}")
else:
    print(decrypted_data)