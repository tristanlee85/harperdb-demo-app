### Query calls (select with conditional and sorting)

```
/AirportCode/?select(iata,airport,latitude,longitude)&country_code=US&sort(+iata)
```

### Env variables

Using `harperdb run .` to run the script, the env variables are not available:

```js
import dotenv from 'dotenv';
dotenv.config();

console.log(process.env);
```

**This is only an issue with the `@harperdb/nextjs` extension is used. Copied
the `.env` file to `/app` as a workaround.**

### Dev mode

Dev mode with `harperdb-nextjs dev` works, but HDB CLI is executed with `harperdb run .`
and therefore doesn't watch for changes (e.g. the `resources.js` file is not reloaded).

Attempted `HARPERDB_NEXTJS_MODE=dev harperdb dev .` but this appears to infinitely
reload due to changes in the `.next` directory.

### Session tracking

Attempted to use `request.login` as a means to track sessions, but received exception of `request is not defined`.
https://docs.harperdb.io/docs/developers/applications/web-applications#cookie-support

### Component not found

Occasionally, trying to hit `http://localhost:9926/app` will result in a `Not found` response, indicating that the
request isn't being handled by the Next.js extension. Neither stopping HDB nor killing the processes on port 9926
seemed to resolve the issue. `pkill -f node` also didn't work. Full restart of the system resolved the issue.

When the start is successful, I see `Debugger listening on ws://127.0.0.1:9229` in the terminal. When it fails, I
get an error that the address is already in use.
