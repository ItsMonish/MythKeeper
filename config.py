from os import urandom
from configparser import ConfigParser

configObject = ConfigParser()
configObject.read("./keeper.conf")

class configs:
    SECRET_KEY = urandom(16)
    SIGNUPS = configObject['Login']['AllowSignUps']
    HOSTING_NAME = configObject['General']['HostingName']
    DB_DIR = configObject['General']['DatabaseFolder']
    STORAGE_DIR = configObject['General']['StorageFolder']
    USR_DIR = configObject['General']['UserFolder']
