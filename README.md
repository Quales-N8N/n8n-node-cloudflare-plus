![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-node-cloudflare-plus

Cloudflare declarative node for n8n with credentials, grouped resource/operation parameters, dynamic loaders, pagination, and robust retry handling.

To make your custom node available to the community, you must create it as an npm package, and [submit it to the npm registry](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry).

If you would like your node to be available on n8n cloud you can also [submit your node for verification](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/).

## Prerequisites

You need the following installed on your development machine:

* [git](https://git-scm.com/downloads)
* Node.js and npm. Minimum version Node 20. You can find instructions on how to install both using nvm (Node Version Manager) for Linux, Mac, and WSL [here](https://github.com/nvm-sh/nvm). For Windows users, refer to Microsoft's guide to [Install NodeJS on Windows](https://docs.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows).
* Install n8n with:
  ```
  npm install n8n -g
  ```
* Recommended: follow n8n's guide to [set up your development environment](https://docs.n8n.io/integrations/creating-nodes/build/node-development-environment/).

## Using this package

These are the basic steps for working with the starter. For detailed guidance on creating and publishing nodes, refer to the [documentation](https://docs.n8n.io/integrations/creating-nodes/).

1. [Generate a new repository](https://github.com/n8n-io/n8n-nodes-starter/generate) from this template repository.
2. Clone your new repo:
   ```
   git clone https://github.com/<your organization>/<your-repo-name>.git
   ```
3. Run `npm i` to install dependencies.
4. Open the project in your editor.
5. Browse the examples in `/nodes` and `/credentials`. Modify the examples, or replace them with your own nodes.
6. Update the `package.json` to match your details.
7. Run `npm run lint` to check for errors or `npm run lintfix` to automatically fix errors when possible.
8. Test your node locally. Refer to [Run your node locally](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/) for guidance.
9. This README documents the Cloudflare node.
10. Update the LICENSE file to use your details.
11. [Publish](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry) your package to npm.

## Cloudflare Node

- Resources: `zone`, `dnsRecord`, `firewallRule`, `cache`, `workers`, `analytics`.
- Operations: `list`, `get`, `create`, `update`, `delete`, plus `purge` (cache), `deploy` (workers), `stats` (analytics).
- Credentials: API Token (recommended) or legacy API Key + Email.
- Dynamic option loaders: Accounts, Zones, DNS Records.
- Pagination: `returnAll` and `limit` with automatic page traversal.
- Rate limits: Exponential backoff and `Retry-After` honored for 429/503.
- Errors: Include Cloudflare error objects in messages.

### Credentials

Create credentials of type `Cloudflare API`. Choose `API Token` (recommended) and paste your token, or use `API Key + Email` if needed. Base URL defaults to `https://api.cloudflare.com/client/v4`.

### Examples

See `examples/` for ready-to-import workflows:
- DNS: create/list/update/delete
- Cache: purge everything for a zone
- Firewall: create rule
- Workers: deploy route to a script

### OpenAPI-based regeneration

If you wish to extend operations using Cloudflare’s OpenAPI:
- Download the OpenAPI spec from Cloudflare’s docs.
- Use your preferred generator to produce operation shapes, then add mappings in `nodes/Cloudflare/Cloudflare.node.ts`.

### Testing

Run unit tests:
```
npm run test
```

Tests cover pagination collection and error formatting/backoff utilities.

## More information

Refer to our [documentation on creating nodes](https://docs.n8n.io/integrations/creating-nodes/) for detailed information on building your own nodes.

## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)
