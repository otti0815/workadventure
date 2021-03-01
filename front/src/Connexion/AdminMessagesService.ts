import {Subject} from "rxjs";

enum AdminMessageEventTypes {
    admin = 1,
    audio,
    //todo add types for ban, etc
}

interface AdminMessageEvent {
    type: AdminMessageEventTypes,
    text: string;
    //todo add optional properties for othe event types
}

//this class is designed to easily allow communication between the RoomConnection objects (that receive the message)
//and the various objects that may render the message on screen
class AdminMessagesService {
    private _messageStream: Subject<AdminMessageEvent> = new Subject();
    public messageStream = this._messageStream.asObservable();
    
    onGlobalMessageReception(text: string) {
        this._messageStream.next({
            type: AdminMessageEventTypes.admin,
            text,
        })
    }
}

export const adminMessagesService = new AdminMessagesService();