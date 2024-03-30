from config import configs
import os

destination = configs.STORAGE_DIR
usrDir = configs.USR_DIR

def saveContent(fileList, owner: str, manifest: str) -> bool:
    recFile = os.path.join(usrDir,"{}".format(owner))
    with open(recFile,'w') as f:
        f.write(manifest)
    for file in fileList:
        fileDest = os.path.join(destination,file['resource'])
        with open(fileDest,'w') as f:
            f.write(file['file'])
            f.close()
    return True 