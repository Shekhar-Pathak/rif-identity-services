import express from 'express'
import cors from 'cors'
import basicAuth from 'express-basic-auth'
import bodyParser from 'body-parser'
import Debug from 'debug'
import { messageToRequest } from '../lib/messageToRequest'
import CredentialRequest from '../lib/CredentialRequest'

const debug = Debug('rif-id:services:backOffice')
const trace = v => { debug(v); return v }

export default function backOffice(port, agent) {
  const app = express()
  app.use(cors())
  app.use(basicAuth({
    users: { 'admin': process.env.ADMIN_PASS }
  }))

  const getAllRequests = () => {
    return agent.dbConnection
      .then(connection => connection.getRepository(CredentialRequest).find({ relations: ['message'] }))
      .then(messages => messages.map(messageToRequest))
  }

  app.post('/auth', function (req, res) {
    res.status(200).send()
  })

  app.get('/identity', function(req, res) {
    debug('Identity requested')

    agent.identityManager.getIdentities()
      .then(identities => {
        if (!identities) return res.status(500).send('No identity')
        res.status(200).send(identities[0].did)
      })
  })

  app.get('/requests', function(req, res) {
    debug(`Query requests`)

    getAllRequests().then(requests => res.status(200).send(JSON.stringify(requests)))
  })

  app.put('/request/:id/status', bodyParser.json(), function(req, res) {
    const { id } = req.params
    const { status } = req.body
    debug(`PUT status ${status} for credential request ${id}`)

    if (status !== 'granted' && status !== 'denied') res.status(400).send('Invalid action')

    agent.dbConnection
      .then(connection => {
        return connection.getRepository(CredentialRequest).findOne({
          where: { id },
          relations: ['message']
        }).then(cr => {
          cr.status = status
          return connection.getRepository(CredentialRequest).save(cr)
        }).then(messageToRequest)
          .then(trace)
          .then(cr => res.status(200).send(JSON.stringify(cr)))
      })
  })

  app.listen(port, () => debug(`Back office service started on port ${port}`))
}