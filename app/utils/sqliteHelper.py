from sqlite3 import connect,Connection
from config import configs

def getDatabaseCursor(dbName: str) -> Connection:
    con = connect(configs.DB_DIR + dbName)
    cur = con.cursor()
    return cur