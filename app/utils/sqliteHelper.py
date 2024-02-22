from sqlite3 import connect
from config import configs

con = None

def getDatabaseCursor(dbName: str):
    global con
    if con == None:
        con = connect(configs.DB_DIR + dbName)
    cur = con.cursor()
    return con,cur