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
