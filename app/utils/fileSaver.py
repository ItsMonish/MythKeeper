from config import configs
import os
from json import loads,dump

destination = configs.STORAGE_DIR
usrDir = configs.USR_DIR

def saveContent(fileList, owner: str, manifest: str) -> bool:

    recFile = os.path.join(usrDir,"{}.json".format(owner))
    with open(recFile,'w') as f:
        dump(loads(manifest),f)
    for file in fileList:
            if file:
                file.save(os.path.join(destination,file.filename))
    return True 