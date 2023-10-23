<template>
    <div>
        <p>{{ status }}</p>
    </div>

    <button @click="init">Start</button>

</template>


<script>

export default {

    data() {
        return {
            audioContext: new (window.AudioContext || window.webkitAudioContext)(),

            audioQueue: [],
            isPlaying: false,

            status: 'This is not using Buffer',

            sttSocket: null,
            isSttSocketConnected: false,

            ttsSocket: null,
            isTtsSocketConnected: false,

            microphone: null,

            //botId: '3ffd8b2d-2f2d-4a9f-9547-afebc50e384a',
            botId: 'e0c3f7a3-7f0c-4afc-b1be-552523323c75',
            userEmail: 'fusionbit.in@gmail.com'

        };
    },

    methods: {


        connectTtsSocket() {

            const vm = this

            vm.ttsSocket = new WebSocket('wss://mebot-api.fusionbit.in/text-to-audio-ws')
            vm.ttsSocket.binaryType = 'arraybuffer'
            vm.ttsSocket.addEventListener("open", () => {
                console.log("TEXT to AUDIO WebSocket endpoint is now OPEN.");
                vm.isSttSocketConnected = true
                vm.connectSttSocket()

            });


            vm.ttsSocket.addEventListener("message", (event) => {
                const vm = this

                console.log("Audio data received")

                console.log(event.data)

                const audioData = new Uint8Array(event.data);
                vm.audioQueue.push(audioData);
                if (!vm.isPlaying) {
                    vm.playNextChunk();
                }

            });

            vm.ttsSocket.addEventListener("close", () => {
                console.log("ttsSocket WebSocket is closed.");
                vm.isSttSocketConnected = false
            });


        },

        connectSttSocket() {

            let vm = this

            vm.sttSocket = new WebSocket('wss://deepgram-ws-7moobktv3q-uc.a.run.app/listen')

            vm.status = vm.status + " connecting to socket... | "

            vm.sttSocket.addEventListener("open", async () => {
                vm.isSttSocketConnected = true

                console.log("STT Socket is NOW OPEN.");

                await vm.startMicrophone()

            });

            vm.sttSocket.addEventListener("message", (event) => {
                const message = event.data;

                console.log("Received message: ", message);

                console.log("SENDING " + message + " TO TTS SOCKET");


                vm.ttsSocket.send(JSON.stringify({
                    query: message,
                    botId: vm.botId,
                    userEmail: vm.userEmail
                }));

            });

            vm.sttSocket.addEventListener("close", () => {
                vm.isSttSocketConnected = false;
                console.log("WebSocket is closed.");
            });

        },

        async startMicrophone() {

            const vm = this

            vm.status = vm.status + " | Connecting to mic..."


            if (!vm.microphone) {
                // open and close the microphone
                vm.microphone = await vm.getMicrophone();
                await vm.openMicrophone();
            } else {
                await vm.closeMicrophone();
                vm.microphone = null;
            }
        },

        async getMicrophone() {

            const userMedia = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            return new MediaRecorder(userMedia);

        },

        async openMicrophone() {

            const vm = this

            await vm.microphone.start(500);

            vm.microphone.onstart = () => {
                console.log("client: microphone opened");

                vm.status = vm.status + " | Mic connected..."

                vm.status = vm.status + " | Connecting STT SOCKET NOW..."

            };

            vm.microphone.onstop = () => {
                console.log("client: microphone closed");
            };

            vm.microphone.ondataavailable = (e) => {
                if (!vm.isPlaying) {

                    console.log("Sending MIC Data STT websocket");

                    vm.sttSocket.send(e.data);

                }
            };
        },

        async closeMicrophone() {
            this.microphone.stop();
        },


        async playNextChunk() {

            const vm = this

            if (vm.audioQueue.length === 0) {
                vm.isPlaying = false;
                return;
            }

            vm.isPlaying = true;
            const audioData = vm.audioQueue.shift();

            try {
                const audioBuffer = await vm.audioContext.decodeAudioData(audioData.buffer);
                const source = vm.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(vm.audioContext.destination);
                source.onended = vm.playNextChunk;
                source.start();
            } catch (error) {
                console.error('Error decoding audio data', error);
            }
        },

        init() {

            const vm = this

            vm.connectTtsSocket()

        }


    },

}


</script>

