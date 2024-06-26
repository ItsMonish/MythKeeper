from sqlite3 import connect
from config import configs

con = None


def getDatabaseCursor():
    global con
    if con == None:
        con = connect(configs.DB_DIR + "database.db", check_same_thread=False)
    cur = con.cursor()
    return con, cur
