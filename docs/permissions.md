# Permissions for AzScout

AzScout needs read-only access to one or more Azure subscriptions.

## Required roles

| Role | Why |
|---|---|
| Reader | List resources and read their configuration |
| Cost Management Reader | Read cost per resource |
| Monitoring Reader | Read activity metrics |

All are read-only. AzScout does not have any write role and cannot modify or delete resources.

## Granting to a user

Replace placeholders with your values.

```bash
SUB_ID=42fc4c05-7234-4f60-b55f-baebec291809
USER=name.surname@comtrade.com

az role assignment create --assignee "$USER" --role "Reader" --scope "/subscriptions/$SUB_ID"
az role assignment create --assignee "$USER" --role "Cost Management Reader" --scope "/subscriptions/$SUB_ID"
az role assignment create --assignee "$USER" --role "Monitoring Reader" --scope "/subscriptions/$SUB_ID"
```

The person running the commands needs Owner or User Access Administrator on the subscription.

## Granting to a Service Principal (recommended for server deployments)

```bash
SUB_ID=42fc4c05-7234-4f60-b55f-baebec291809

# Create the SP scoped to Reader
az ad sp create-for-rbac --name "azscout-readonly" --role "Reader" --scopes "/subscriptions/$SUB_ID"
# Copy the appId and password from the output

SP_ID=<appId from above>

az role assignment create --assignee "$SP_ID" --role "Cost Management Reader" --scope "/subscriptions/$SUB_ID"
az role assignment create --assignee "$SP_ID" --role "Monitoring Reader" --scope "/subscriptions/$SUB_ID"
```

Then put the SP credentials in `.env.docker`:

```bash
AZURE_TENANT_ID=<tenant>
AZURE_CLIENT_ID=<appId>
AZURE_CLIENT_SECRET=<password>
```

## Granting at the Management Group level (multiple subscriptions at once)

If your subscriptions live under a common Management Group, scope the assignments to the MG instead of each subscription:

```bash
MG_ID=ai-team-mg
az role assignment create --assignee "$USER" --role "Reader" --scope "/providers/Microsoft.Management/managementGroups/$MG_ID"
```

This propagates to every subscription under that MG. Same idea for the other two roles.
