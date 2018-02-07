# ILP SPSP Server
> Command-line tool to run an SPSP server

- [Example](#example)
- [Help](#help)

## Example

You must be running [Moneyd](https://github.com/sharafian/moneyd) to use this
module.

In one terminal, run:

```
npm install -g ilp-spsp-server ilp-spsp
ilp-spsp-server --subdomain 123456 # you may need to change this to a unique name
```

Then in a second terminal, run:

```
ilp-spsp send --receiver '$123456.localtunnel.me' --amount 100
```

You'll see `sent!` on the sending side, and `got packet for 100 drops` on the
receiving side.

## Help

```
Options:
  --subdomain    subdomain for localtunnel  [default: "<Random>"]
  --localtunnel  use localtunnel  [default: true]
  --port         port to listen locally
  --help         Show help  [boolean]
```
