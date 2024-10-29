import { join } from 'path'
import { EVENTS } from '@builderbot/bot'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { JsonFileDB as Database } from '@builderbot/database-json'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3000

const mainFlow = addKeyword(['hola', 'buen dia', 'buenas tardes', 'buenas noches'])
    .addAnswer('¡Hola! 🍕 Bienvenido a *BIG PIZZA*, ¿En qué podemos ayudarte hoy?',
        null, async (ctx, {gotoFlow, fallBack})=>{
            gotoFlow(menuFlow);
         }
    )
     

const menuFlow = addKeyword(['menu', 'menú'])
    .addAnswer('Selecciona una opción del menú para continuar:')
    .addAnswer(
        [ 
            '🍕 *BIG PIZZA:* 🍕',
            '*1*. Precios y Menu.',
            '*2*. Horarios de atencion.',
            '*3*. Realizar pedido para delivery.',
            '*4*. Realizar pedido para retirar.',
            '*5*. Direccion.',
        ],
        { capture: true },
     async (ctx, {gotoFlow})=>{
        switch(ctx.body){
            case "1":
                return gotoFlow(precioFlow);
            case "2":
                return gotoFlow(horarioFlow);
            case "3":
                return gotoFlow(deliveryFlow);
            case "4":
                return gotoFlow(pedidoFlow);
            case "5":
                return gotoFlow(ubicacionFlow);
            }
        }
    );
//---------PRECIOS
const precioFlow = addKeyword([EVENTS.ACTION , 'precio', 'carta'])
    .addAnswer('Enviando...')
    .addAnswer('🍕¡Esta es la carta!',
        {
            media:'https://i.imgur.com/4cS3SfZ.jpeg' 
        }, async (ctx, {gotoFlow})=>{
            gotoFlow(dataFlow);
        }
    );
//----------HORARIO
const horarioFlow = addKeyword([EVENTS.ACTION, 'horario'])
.addAnswer('🍕 Nuestro horario de atención es de: \n *lunes a lunes, de 10 a 24 hs*.',
    null, async (ctx, {gotoFlow})=>{
        gotoFlow(dataFlow);
    }
);

//----------DELIVERY
const deliveryFlow = addKeyword([EVENTS.ACTION, 'delivery', 'envios'])
.addAnswer('🍕 Por favor, indícanos: la dirección de entrega.', 
    { capture: true },  
    async (ctx, { flowDynamic }) => {
         await flowDynamic([ '🍕 ¿Qué te gustaría pedir? Puedes enviar tu pedido en *un* solo mensaje ahora.' ]);
         await flowDynamic([ 'Especifique: sabores, ingredientes, y observaciones']);
    }
)
.addAnswer(null, 
    { capture: true },  
    async (ctx, { flowDynamic }) => {
         await flowDynamic([ '🍕 ¡Gracias por tu pedido! En breve será confirmado por nuestro personal.' ]);
    }
)
//---------- PEDIDO RETIRO EN LOCALES --------------------------------
const pedidoFlow = addKeyword(EVENTS.ACTION, 'pedido')
.addAnswer('🍕 ¿Qué te gustaría pedir? Puedes enviar tu pedido en *un* solo mensaje ahora.', 
    { capture: true },  
    async (ctx, { flowDynamic }) => {
         await flowDynamic([ '🍕 ¡Gracias por tu pedido! En breve será confirmado por nuestro personal."' ]);
    }
)



//----------- UBICACION ----------------
const ubicacionFlow = addKeyword(EVENTS.ACTION, 'pedido')
.addAnswer('📍 Estamos ubicados en Av Cabildo 3776: \n https://maps.app.goo.gl/NcqaSXohFLQ9xVG66'
    , async (ctx, {gotoFlow})=>{
        gotoFlow(dataFlow);
    }
);



//----------- ENVIO AL MENU --------------------------------
const dataFlow = addKeyword([EVENTS.ACTION])
.addAnswer('📋 Para acceder a las opciones anteriores envie: \n *1* ó *Menu*',
    { capture: true },  
    async (ctx, {gotoFlow})=>{
        switch(ctx.body){
            case "1":
                return gotoFlow(menuFlow);
            case "Menu":
                return gotoFlow(menuFlow);
            }
        }
)

//
//
// ------------ CONFIGURATION ----------------
//
//

const main = async () => {
    const adapterFlow = createFlow([mainFlow, menuFlow, precioFlow, horarioFlow, deliveryFlow, pedidoFlow, ubicacionFlow, dataFlow])
    
    const adapterProvider = createProvider(Provider)
    
    const adapterDB = new Database({ filename: 'db.json' })

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
