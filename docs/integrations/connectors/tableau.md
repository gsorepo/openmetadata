---
description: This guide will help install Tableau connector and run manually
---

# Tableau

{% hint style="info" %}
**Prerequisites**

OpenMetadata is built using Java, DropWizard, Jetty, and MySQL.

1. Python 3.7 or above
{% endhint %}

### Install from PyPI

{% tabs %}
{% tab title="Install Using PyPI" %}
```bash
pip install 'openmetadata-ingestion[tableau]'
```
{% endtab %}
{% endtabs %}

### Run Manually

```bash
metadata ingest -c ./examples/workflows/tableau.json
```

### Configuration

{% code title="tableau.json" %}
```javascript
{
  "source": {
    "type": "tableau",
    "config": {
      "username": "username",
      "password": "password",
      "personal_access_token_secret": "personal_access_token_secret",
      "personal_access_token_name": "personal_access_token_name",
      "service_name": "local_tableau",
      "server": "server_address",
      "site_name": "site_name",
      "site_url": "site_url",
      "api_version": "api version",
      "env": "env"
    }
  },
 ...
```
{% endcode %}

1. **username** - pass the Tableau username.
2. **password** - password for the username.
3. **personal\_access\_token\_secret** - **** pass the personal access token secret
4. **personal\_access\_token\_name** - pass the personal access token name
5. **server** - address of the server.
6. **site\_name** - pass the site name.
7. **site\_url** - pass the tableau connector url.
8. **api\_version** - pass an api version.
9. **service\_name** - Service Name for this Tableau cluster. If you added Tableau cluster through OpenMetadata UI, make sure the service name matches the same.
10. **filter\_pattern** - It contains includes, excludes options to choose which pattern of datasets you want to ingest into OpenMetadata

## Publish to OpenMetadata

Below is the configuration to publish Tableau data into the OpenMetadata service.

Add `metadata-rest` sink along with `metadata-server` config

{% code title="tableau.json" %}
```javascript
{
  "source": {
    "type": "tableau",
    "config": {
      "username": "username",
      "password": "password",
      "service_name": "local_tableau",
      "server": "server_address",
      "site_name": "site_name",
      "site_url": "site_url",
      "api_version": "api version",
      "env": "env"
    }
  },
  "sink": {
    "type": "metadata-rest",
    "config": {}
  },
  "metadata_server": {
    "type": "metadata-server",
    "config": {
      "api_endpoint": "http://localhost:8585/api",
      "auth_provider_type": "no-auth"
    }
  }
}
```
{% endcode %}
