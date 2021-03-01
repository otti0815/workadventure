import {BaseController} from "./BaseController";
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {parse} from "query-string";
import {ADMIN_API_TOKEN} from "_Enum/EnvironmentVariable";
import {apiClientRepository} from "../Services/ApiClientRepository";
import {AdminGlobalMessage} from "../Messages/generated/messages_pb";


export class AdminController extends BaseController{

    constructor(private App : TemplatedApp) {
        super();
        this.App = App;
        this.receiveGlobalMessagePrompt();
    }
    
    receiveGlobalMessagePrompt() {
        this.App.options("/message", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        this.App.post("/message", (res: HttpResponse, req: HttpRequest) => {

            res.onAborted(() => {
                console.warn('/message request was aborted');
            })

            const query = parse(req.getQuery());

            const token = query.token;
            if (token !== ADMIN_API_TOKEN) {
                console.log('Admin access refused for token: '+token)
                res.writeStatus("401 Unauthorized").end('Incorrect token');
                return;
            }

            try {
                if (typeof query.text !== 'string') {
                   throw 'Incorrect text parameter'
                }
                if (!query.targets || typeof query.targets !== 'object') {
                    throw 'Incorrect targets parameter'
                }
                const text: string = query.text;
                const targets: string[] = query.targets;

                targets.forEach(async (roomId) => {
                    const roomClient = await apiClientRepository.getClient(roomId);
                    const message = new AdminGlobalMessage();
                    message.setMessage(text);
                    roomClient.sendGlobalAdminMessage(message, () => {});
                })
                
            } catch (err) {
                res.writeStatus("400 Bad request");
                this.addCorsHeaders(res);
                res.end(err);
                
            }

        });
    }
}
