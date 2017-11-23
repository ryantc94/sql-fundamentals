import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as sqlite from 'sqlite';
import { promisify } from 'util';
import { MASTER_DB_FILE, PROJECT_ROOT } from '../constants';
import { logger } from '../log';

async function fileExists(pth: string) {
  return new Promise(resolve => {
    fs.exists(pth, resolve);
  });
}

export const dbPath = (name: string) =>
  path.join(PROJECT_ROOT, `${name}.sqlite`);

const dbPromises: { [key: string]: Promise<sqlite.Database> } = {};

export async function getDb(name: string): Promise<sqlite.Database> {
  let pathToDb = dbPath(name);
  let doesExist = await fileExists(pathToDb);
  let db: sqlite.Database;
  if (!doesExist) {
    await initializeDb(name);
  }
  if (dbPromises[name]) {
    return await dbPromises[name];
  }
  dbPromises[name] = sqlite.open(pathToDb, {
    verbose: true
  });
  db = await dbPromises[name];
  db.on('profile', (sql: string, time: number) => {
    logger.info(
      [chalk.cyan(sql), `(${chalk.yellow(`${time.toPrecision(2)}ms`)})`].join(
        ' '
      )
    );
  });
  return db;
}

const copyFile = promisify(fs.copyFile);

export async function initializeDb(dbName = 'dev') {
  let pth = dbPath(dbName);
  if (!fs.existsSync(pth)) {
    logger.debug(
      `Database ${dbName} was not found at ${pth}... creating it now`
    );
    await copyFile(MASTER_DB_FILE, pth);
  }
}
