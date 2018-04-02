#!/usr/bin/env node
const chalk = require('chalk')
const getPort = require('get-port')
const plugin = require('ilp-plugin')()
const localtunnel = require('localtunnel')
const { Server } = require('ilp-protocol-stream')
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
  await plugin.connect()

  const port = argv.port || await getPort()
  const server = new Server({
    plugin,
    serverSecret: crypto.randomBytes(32)
  })

  server.on('connection', connection => {
    connection.on('money_stream', stream => {
      stream.setReceiveMax(Infinity)
      stream.on('incoming', amount => {
        console.log('got packet for', params.prepare.amount, 'units')
      })
    })
  })

  console.log('created receiver...')
  async function handleSPSP (ctx, next) {
    if (ctx.get('Accept').indexOf('application/spsp+json') !== -1) {
      const details = server.generateAddressAndSecret()
      ctx.set('Content-Type', 'application/spsp+json')
      ctx.body = {
        destination_account: details.destinationAccount,
        shared_secret: details.sharedSecret.toString('base64')
      }
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
