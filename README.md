Frontend client for https://daam.deals. Built with Svelte

### Deploying with Dokku
- Add the nginx buildpack (see `.buildpacks`)
- Add a empty .static file in the root of the project
- set NGINX_ROOT=dist config
- Add app.json to build the static files
- Set API_URL config in dokku
> If the API app name is `my-api` then the value will be `http://my-api.web:5000`
- dokku network:create custom-network
- dokku network:set <server> attach-post-create custom-network
- dokku network:set <client> attach-post-create custom-network


### Contributing
Create an issue or submit a PR if you have noticed any bugs or would like to change something!
