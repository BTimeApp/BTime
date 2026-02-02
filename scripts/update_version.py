import json
import argparse

"""
A simple script that updates version numbers in package.jsons. 

TODO:
 - allow fine-tuning the dirs to update
 - check that version numbers are valid and are higher than the previous version numbers
"""

# compares B to A. returns 1 if B larger, 0 if same, -1 if A larger. throws on bad input
def compareVersions(versA: str, versB: str):
    ANums = list(map(lambda x: int(x), versA.split(".")))
    BNums = list(map(lambda x: int(x), versB.split(".")))
    for i in range(3):
        if ANums[i] > BNums[i]: 
            return -1
        elif BNums[i] > ANums[i]:
            return 1
    return 0

def updateVersions(newVersion: str):
    dirs = ["website", "website/frontend", "website/backend"]

    for dir_path in dirs:
        pkg_path = f"{dir_path}/package.json"
        with open(pkg_path, 'r') as f:
            data = json.load(f)
        if compareVersions(data['version'], newVersion) <= 0:
            raise AssertionError(f"New version number {newVersion} is not newer than existing version number {data['version']} of package {dir_path}.")
        data['version'] = newVersion
        with open(pkg_path, 'w') as f:
            json.dump(data, f, indent=2)
            f.write('\n')

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-v", "--version", help="version number to update to")
    args = parser.parse_args()
    updateVersions(args.version)
    