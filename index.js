#!/usr/bin/env node
const crypto = require('crypto')
const chalk = require('chalk')
const getPort = require('get-port')
const plugin = require('ilp-plugin')()
const localtunnel = require('localtunnel')
const { PaymentServer } = require('ilp-protocol-paystream')
const Koa = require('koa')
const app = new Koa()

const name = require('crypto').randomBytes(8).toString('hex')
const argv = require('yargs')
  .option('subdomain', {
    default: name,
    description: 'subdomain for localtunnel'
  })
  .option('localtunnel', {
    default: true,
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
  const receiver = new PaymentServer(plugin, crypto.randomBytes(32))
  await receiver.connect()

  console.log('created receiver...')
  async function handleSPSP (ctx, next) {
    if (ctx.get('Accept').indexOf('application/spsp4+json') !== -1) {
      const socket = receiver.createSocket({
        enableRefunds: true
      })

      ctx.set('Content-Type', 'application/spsp4+json')
      ctx.body = {
        destination_account: socket.destinationAccount,
        shared_secret: socket.sharedSecret.toString('base64')
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
