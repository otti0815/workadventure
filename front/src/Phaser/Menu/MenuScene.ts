import {LoginScene, LoginSceneName} from "../Login/LoginScene";
import {SelectCharacterScene, SelectCharacterSceneName} from "../Login/SelectCharacterScene";
import {gameManager} from "../Game/GameManager";
import {localUserStore} from "../../Connexion/LocalUserStore";
import {mediaManager} from "../../WebRtc/MediaManager";
import {gameReportKey, gameReportRessource, ReportMenu} from "./ReportMenu";
import {connectionManager} from "../../Connexion/ConnectionManager";
import {GameConnexionTypes} from "../../Url/UrlManager";
import {UserDetailsMessage} from "../../Messages/generated/messages_pb";

export const MenuSceneName = 'MenuScene';
const gameMenuKey = 'gameMenu';
const gameMenuIconKey = 'gameMenuIcon';
const gameSettingsMenuKey = 'gameSettingsMenu';
const gameShare = 'gameShare';
const userList = 'userList';

const closedSideMenuX = -200;
const openedSideMenuX = 0;

/**
 * The scene that manages the game menu, rendered using a DOM element.
 */
export class MenuScene extends Phaser.Scene {
    private menuElement!: Phaser.GameObjects.DOMElement;
    private gameQualityMenuElement!: Phaser.GameObjects.DOMElement;
    private gameShareElement!: Phaser.GameObjects.DOMElement;
    private userListElement!: Phaser.GameObjects.DOMElement;
    private gameReportElement!: ReportMenu;
    private sideMenuOpened = false;
    private settingsMenuOpened = false;
    private gameShareOpened = false;
    private userListOpened = false;
    private gameQualityValue: number;
    private videoQualityValue: number;
    private menuButton!: Phaser.GameObjects.DOMElement;

    private wasCreated = false;

    private userList = new Array<UserDetailsMessage>();

    constructor() {
        super({key: MenuSceneName});

        this.gameQualityValue = localUserStore.getGameQualityValue();
        this.videoQualityValue = localUserStore.getVideoQualityValue();
    }

    preload () {
        this.load.html(gameMenuKey, 'resources/html/gameMenu.html');
        this.load.html(gameMenuIconKey, 'resources/html/gameMenuIcon.html');
        this.load.html(gameSettingsMenuKey, 'resources/html/gameQualityMenu.html');
        this.load.html(gameShare, 'resources/html/gameShare.html');
        this.load.html(userList, 'resources/html/userList.html');
        this.load.html(gameReportKey, gameReportRessource);
    }

    create() {
        this.menuElement = this.add.dom(closedSideMenuX, 30).createFromCache(gameMenuKey);
        this.menuElement.setOrigin(0);
        MenuScene.revealMenusAfterInit(this.menuElement, 'gameMenu');

        const middleX = (window.innerWidth / 3) - 298;
        this.gameQualityMenuElement = this.add.dom(middleX, -400).createFromCache(gameSettingsMenuKey);
        MenuScene.revealMenusAfterInit(this.gameQualityMenuElement, 'gameQuality');


        this.gameShareElement = this.add.dom(middleX, -400).createFromCache(gameShare);
        MenuScene.revealMenusAfterInit(this.gameShareElement, gameShare);
        this.gameShareElement.addListener('click');
        this.gameShareElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if((event?.target as HTMLInputElement).id === 'gameShareFormSubmit') {
                this.copyLink();
            }else if((event?.target as HTMLInputElement).id === 'gameShareFormCancel') {
                this.closeGameShare();
            }
        });

        this.userListElement = this.add.dom(middleX, -400).createFromCache(userList);
        MenuScene.revealMenusAfterInit(this.userListElement, userList);
        this.userListElement.addListener('click');
        this.userListElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if((event?.target as HTMLInputElement).id === 'userListFormClose') {
                this.closeUserListWindow();
            }
        });


        this.gameReportElement = new ReportMenu(this, connectionManager.getConnexionType === GameConnexionTypes.anonymous);
        mediaManager.setShowReportModalCallBacks((userId, userName) => {
            this.closeAll();
            this.gameReportElement.open(parseInt(userId), userName);
        });

        this.input.keyboard.on('keyup-TAB', () => {
            this.sideMenuOpened ? this.closeSideMenu() : this.openSideMenu();
        });
        this.menuButton = this.add.dom(0, 0).createFromCache(gameMenuIconKey);
        this.menuButton.addListener('click');
        this.menuButton.on('click', () => {
            this.sideMenuOpened ? this.closeSideMenu() : this.openSideMenu();
        });

        this.menuElement.addListener('click');
        this.menuElement.on('click', this.onMenuClick.bind(this));
    }

    //todo put this method in a parent menuElement class

    static revealMenusAfterInit(menuElement: Phaser.GameObjects.DOMElement, rootDomId: string) {
        //Dom elements will appear inside the viewer screen when creating before being moved out of it, which create a flicker effect.
        //To prevent this, we put a 'hidden' attribute on the root element, we remove it only after the init is done.
        setTimeout(() => {
            (menuElement.getChildByID(rootDomId) as HTMLElement).hidden = false;
        }, 250);
    }

    public revealMenuIcon(): void {
        (this.menuButton.getChildByID('menuIcon') as HTMLElement).hidden = false
    }

    openSideMenu() {
        if (this.sideMenuOpened) return;
        this.closeAll();
        this.sideMenuOpened = true;
        this.menuButton.getChildByID('openMenuButton').innerHTML = 'X';

        if (!this.wasCreated) {
            gameManager.getCurrentGameScene(this).connection.onUserListMessage((userList, message) => {
                // console.log(userList);
                const userListWindow = this.userListElement.getChildByID('listparent');
                userList = userList.sort((n1: UserDetailsMessage, n2: UserDetailsMessage) => {
                    if (n1.getRoomid() > n2.getRoomid()) {
                        return 1;
                    }
                    if (n1.getRoomid() < n2.getRoomid()) {
                        return -1;
                    }
                    return 0;
                });
                let groupChange = "";
                userListWindow.textContent = '';
                for (const singleUsername of userList) {
                    if (groupChange !== singleUsername.getRoomid()) {
                        groupChange = singleUsername.getRoomid();
                        // console.log("new room set");
                        const node = document.createElement('li');
                        const innerNode = document.createElement('b');
                        innerNode.appendChild(document.createTextNode(singleUsername.getRoomid().substr(singleUsername.getRoomid().lastIndexOf("/")).replace(".json","")));
                        node.prepend(innerNode);
                        
                        userListWindow.append(node);
                    }
                    const node = document.createElement('li');
                    node.appendChild(document.createTextNode(singleUsername.getUsername()));
                    userListWindow.append(node);


                }
            });
            this.wasCreated = true;
        }

        if (gameManager.getCurrentGameScene(this).connection && gameManager.getCurrentGameScene(this).connection.isAdmin()) {
            const adminSection = this.menuElement.getChildByID('adminConsoleSection') as HTMLElement;
            adminSection.hidden = false;
        }
        //TODO bind with future metadata of card
        //if (connectionManager.getConnexionType === GameConnexionTypes.anonymous){
            const adminSection = this.menuElement.getChildByID('socialLinks') as HTMLElement;
            adminSection.hidden = false;
        //}
        this.tweens.add({
            targets: this.menuElement,
            x: openedSideMenuX,
            duration: 500,
            ease: 'Power3'
        });
    }

    private closeSideMenu(): void {
        if (!this.sideMenuOpened) return;
        this.sideMenuOpened = false;
        this.closeAll();
        this.menuButton.getChildByID('openMenuButton').innerHTML = `<img src="/static/images/menu.svg">`;
        gameManager.getCurrentGameScene(this).ConsoleGlobalMessageManager.disabledMessageConsole();
        this.tweens.add({
            targets: this.menuElement,
            x: closedSideMenuX,
            duration: 500,
            ease: 'Power3'
        });
    }

    private openGameSettingsMenu(): void {
        if (this.settingsMenuOpened) {
            this.closeGameQualityMenu();
            return;
        }
        //close all
        this.closeAll();

        this.settingsMenuOpened = true;

        const gameQualitySelect = this.gameQualityMenuElement.getChildByID('select-game-quality') as HTMLInputElement;
        gameQualitySelect.value = ''+this.gameQualityValue;
        const videoQualitySelect = this.gameQualityMenuElement.getChildByID('select-video-quality') as HTMLInputElement;
        videoQualitySelect.value = ''+this.videoQualityValue;

        this.gameQualityMenuElement.addListener('click');
        this.gameQualityMenuElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if ((event?.target as HTMLInputElement).id === 'gameQualityFormSubmit') {
                const gameQualitySelect = this.gameQualityMenuElement.getChildByID('select-game-quality') as HTMLInputElement;
                const videoQualitySelect = this.gameQualityMenuElement.getChildByID('select-video-quality') as HTMLInputElement;
                this.saveSetting(parseInt(gameQualitySelect.value), parseInt(videoQualitySelect.value));
            } else if((event?.target as HTMLInputElement).id === 'gameQualityFormCancel') {
                this.closeGameQualityMenu();
            }
        });

        let middleY = (window.innerHeight / 3) - (257);
        if(middleY < 0){
            middleY = 0;
        }
        let middleX = (window.innerWidth / 3) - 298;
        if(middleX < 0){
            middleX = 0;
        }
        this.tweens.add({
            targets: this.gameQualityMenuElement,
            y: middleY,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private closeGameQualityMenu(): void {
        if (!this.settingsMenuOpened) return;
        this.settingsMenuOpened = false;

        this.gameQualityMenuElement.removeListener('click');
        this.tweens.add({
            targets: this.gameQualityMenuElement,
            y: -400,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private openUserListWindow(): void {
        if (this.userListOpened) {
            this.closeUserListWindow();
            return;
        }
        this.closeAll();

        // const userListWindow = this.userListElement.getChildByID('userListWindow') as HTMLInputElement;
        // userListWindow.value = location.toString();
        const allUsers = gameManager.getCurrentGameScene(this).getAllUsersOnMap();

        // gameManager.getCurrentGameScene(this).getAllUsersInHouse();
        gameManager.getCurrentGameScene(this).connection.emitUserListMessage();

        // this.gameManager.getconnection.onStartJitsiRoom((jwt, room) => {
        //     this.startJitsi(room, jwt);
        // });

        // const userListWindow = this.userListElement.getChildByID('listparent');
        // for (const singleUsername of allUsers) {
        //
        //     const node = document.createElement('li');
        //     node.appendChild(document.createTextNode(singleUsername));
        //     userListWindow.append(node);
        // }
        // document.querySelector('ul').appendChild(node);
        this.userListOpened = true;

        let middleY = (window.innerHeight / 3) - (257);
        if(middleY < 0){
            middleY = 0;
        }
        let middleX = (window.innerWidth / 3) - 298;
        if(middleX < 0){
            middleX = 0;
        }

        this.tweens.add({
            targets: this.userListElement,
            y: middleY,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });

    }

    private openGameShare(): void{
        if (this.gameShareOpened) {
            this.closeGameShare();
            return;
        }
        //close all
        this.closeAll();

        const gameShareLink = this.gameShareElement.getChildByID('gameShareLink') as HTMLInputElement;
        gameShareLink.value = location.toString();

        this.gameShareOpened = true;

        let middleY = (window.innerHeight / 3) - (257);
        if(middleY < 0){
            middleY = 0;
        }
        let middleX = (window.innerWidth / 3) - 298;
        if(middleX < 0){
            middleX = 0;
        }
        this.tweens.add({
            targets: this.gameShareElement,
            y: middleY,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private closeUserListWindow(): void {
        const userListWindow = this.userListElement.getChildByID('userListInfo') as HTMLParagraphElement;
        userListWindow.innerText = '';
        userListWindow.style.display = 'none';
        this.userListOpened = false;
        this.tweens.add({
            targets: this.userListElement,
            y: -400,
            duration: 1000,
            ease: 'Power3'
        });

    }

    private closeGameShare(): void{
        const gameShareInfo = this.gameShareElement.getChildByID('gameShareInfo') as HTMLParagraphElement;
        gameShareInfo.innerText = '';
        gameShareInfo.style.display = 'none';
        this.gameShareOpened = false;
        this.tweens.add({
            targets: this.gameShareElement,
            y: -400,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private onMenuClick(event:MouseEvent) {
        if((event?.target as HTMLInputElement).classList.contains('not-button')){
            return;
        }
        event.preventDefault();

        switch ((event?.target as HTMLInputElement).id) {
            case 'changeNameButton':
                this.closeSideMenu();
                gameManager.leaveGame(this, LoginSceneName, new LoginScene());
                break;
            case 'sparkButton':
                this.gotToCreateMapPage();
                break;
            case 'changeSkinButton':
                this.closeSideMenu();
                gameManager.leaveGame(this, SelectCharacterSceneName, new SelectCharacterScene());
                break;
            case 'closeButton':
                this.closeSideMenu();
                break;
            case 'shareButton':
                this.openGameShare();
                break;
            case 'onlineUserButton':
                this.openUserListWindow();
                break;
            case 'editGameSettingsButton':
                this.openGameSettingsMenu();
                break;
            case 'adminConsoleButton':
                gameManager.getCurrentGameScene(this).ConsoleGlobalMessageManager.activeMessageConsole();
                break;
        }
    }

    private async copyLink() {
        await navigator.clipboard.writeText(location.toString());
        const gameShareInfo = this.gameShareElement.getChildByID('gameShareInfo') as HTMLParagraphElement;
        gameShareInfo.innerText = 'Link copied, you can share it now!';
        gameShareInfo.style.display = 'block';
    }

    private saveSetting(valueGame: number, valueVideo: number){
        if (valueGame !== this.gameQualityValue) {
            this.gameQualityValue = valueGame;
            localUserStore.setGameQualityValue(valueGame);
            window.location.reload();
        }
        if (valueVideo !== this.videoQualityValue) {
            this.videoQualityValue = valueVideo;
            localUserStore.setVideoQualityValue(valueVideo);
            mediaManager.updateCameraQuality(valueVideo);
        }
        this.closeGameQualityMenu();
    }

    private gotToCreateMapPage() {
        const sparkHost = 'https://'+window.location.host.replace('play.', '')+'/choose-map.html';
        window.open(sparkHost, '_blank');
    }

    private closeAll(){
        this.closeGameQualityMenu();
        this.closeGameShare();
        this.gameReportElement.close();
        this.closeUserListWindow();
    }
}
