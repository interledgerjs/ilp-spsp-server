#!/usr/bin/env node
const chalk = require('chalk')
const getPort = require('get-port')
const makePlugin = require('ilp-plugin')
const localtunnel = require('localtunnel')
const { Server } = require('ilp-protocol-stream')
const PSK2 = require('ilp-protocol-psk2')
const Koa = require('koa')
const app = new Koa()
const crypto = require('crypto')

const name = crypto.randomBytes(8).toString('hex')
const argv = require('yargs')
  .option('subdomain', {
    default: name,
    description: 'subdomain for localtunnel'
  })
  .option('localtunnel', {
    default: true,
    type: 'boolean',
    description: 'use localtunnel'
  })
  .option('port', {
    description: 'port to listen locally'
  })
  .help('help')
  .argv

async function run () {
  console.log('connecting...')
  const pskPlugin = makePlugin()
  const streamPlugin = makePlugin()

  await streamPlugin.connect()
  await pskPlugin.connect()

  const port = argv.port || await getPort()
  const streamServer = new Server({
    plugin: streamPlugin,
    serverSecret: crypto.randomBytes(32)
  })

  streamServer.on('connection', connection => {
    connection.on('stream', stream => {
      stream.setReceiveMax(10000000000000)
      stream.on('money', amount => {
        console.log('got packet for', amount, 'units')
      })
    })
  })

  await streamServer.listen()

  // PSK2 is included for backwards compatibility
  const pskReceiver = await PSK2.createReceiver({
    plugin: pskPlugin,
    paymentHandler: async params => {
      console.log('got packet for', params.prepare.amount, 'units')
      return params.acceptSingleChunk()
    }
  })

  console.log('created receiver...')
  async function handleSPSP (ctx, next) {
    if (ctx.get('Accept').indexOf('application/spsp4+json') !== -1) {
      const details = streamServer.generateAddressAndSecret()
      ctx.body = {
        destination_account: details.destinationAccount,
        shared_secret: details.sharedSecret.toString('base64')
      }
      ctx.set('Content-Type', 'application/spsp4+json')
      ctx.set('Access-Control-Allow-Origin', '*')
    } else if (ctx.get('Accept').indexOf('application/spsp+json') !== -1) {
      const details = pskReceiver.generateAddressAndSecret()
      ctx.body = {
        destination_account: details.destinationAccount,
        shared_secret: details.sharedSecret.toString('base64')
      }
      ctx.set('Content-Type', 'application/spsp+json')
      ctx.set('Access-Control-Allow-Origin', '*')
    } else {
      return next()
    }
  }

  app
    .use(handleSPSP)
    .listen(port)

  console.log('listening on ' + port)
  if (argv.localtunnel) {
    localtunnel(port, { subdomain: argv.subdomain }, (err, tunnel) => {
      if (err) {
        console.error(err)
        process.exit(1)
      }

      console.log(chalk.green('public at:', tunnel.url))
      console.log(chalk.green('payment pointer is:', '$' + argv.subdomain + '.localtunnel.me'))
    })
  }
}

run()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
