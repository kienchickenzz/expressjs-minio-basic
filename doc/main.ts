import express, { Request, Response } from 'express'
import http from 'http'
import swaggerUi from 'swagger-ui-express'

import { swaggerDocs, swaggerExplorerOptions } from './swagger.config'

const app = express()

app.get('/', (req: Request, res: Response) => {
    res.redirect('/api-docs')
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerExplorerOptions))

const start = () => {
    const port = 6655
    http.createServer(app).listen(port, () => {
        console.log(`Documentation server is running on http://localhost:${port}`)
    })
}

start()
