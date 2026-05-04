import { app } from './app'
import { config } from './config/env'

const port = Number(config.port || 3000)

app.listen(port, () => {
	// eslint-disable-next-line no-console
	console.log(`Backend listening on http://localhost:${port}`)
})
