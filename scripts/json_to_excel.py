import json, os
import pandas as pd

file_path = input("Enter the file path: ")

with open(file_path) as f:
    data = json.load(f)

df = pd.DataFrame(data["investments"])

directory, filename = os.path.split(file_path)
new_filepath = os.path.join(
    directory, f"{os.path.splitext(filename)[0]}_investments.xlsx"
)

df.to_excel(new_filepath, index=False)

print(f"File saved as: {new_filepath}")
