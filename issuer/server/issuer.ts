import dotenv from 'dotenv'
import Debug from 'debug'

import setupDb from './setup/db'
import setupAgent from './setup/agent'
import setupIdentity from './setup/identity'

import credentialRequestService from './services/credentialRequests'
import backOffice from './services/backOffice'

const debug = Debug('rif-id:main')
dotenv.config()

debug('Setting up')

export async function runIssuer ({
  secretBoxKey,
  rpcUrl,
  debuggerOptions,
  adminPass,
  apps,
  credentialRequestServicePrefix,
  backOfficePrefix,
  launchCredentialRequestService,
  launchBackOffice,
  database
}) {
  /* debugger from .env */
  if (debuggerOptions) {
    Debug.enable(debuggerOptions)
  }

  const dbConnection = setupDb(database)
  const agent = setupAgent(dbConnection, secretBoxKey, rpcUrl)
  await setupIdentity(agent)

  debug('Setting up services')
  if (launchCredentialRequestService) credentialRequestService(apps[0], agent, credentialRequestServicePrefix)
  if (launchBackOffice) backOffice(apps.length > 1 ? apps[1] : apps[0], agent, adminPass, backOfficePrefix)
  debug('Services set up')
}
