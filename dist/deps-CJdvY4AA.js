import { Ar as sendMessageWhatsApp, L as sendMessageTelegram, Nr as sendMessageSlack, R as sendMessageDiscord, r as sendMessageIMessage } from "./loader-DJRotWxM.js";
import { m as sendMessageSignal } from "./deliver-pFMP5UiT.js";

//#region src/cli/deps.ts
function createDefaultDeps() {
	return {
		sendMessageWhatsApp,
		sendMessageTelegram,
		sendMessageDiscord,
		sendMessageSlack,
		sendMessageSignal,
		sendMessageIMessage
	};
}
function createOutboundSendDeps(deps) {
	return {
		sendWhatsApp: deps.sendMessageWhatsApp,
		sendTelegram: deps.sendMessageTelegram,
		sendDiscord: deps.sendMessageDiscord,
		sendSlack: deps.sendMessageSlack,
		sendSignal: deps.sendMessageSignal,
		sendIMessage: deps.sendMessageIMessage
	};
}

//#endregion
export { createOutboundSendDeps as n, createDefaultDeps as t };