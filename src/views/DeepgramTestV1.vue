<template>
    <div>
        <h1>DEEPGRAM</h1>
        <h5>START SPEAKING</h5>
        <p>{{ text }}</p>

    </div>
</template>


<script>

export default {

    data() {
        return {
            socket: null,
            socket2: null,
            connected: false,
            microphone: null,
            text: '',
            callingTextToAudioApi: false,

            audioContext: new (window.AudioContext || window.webkitAudioContext)(),
            audioStack: [],
            isPlaying: false,
            audioBuffer: new Uint8Array(),

            audioBufferSourceNode: null
        };
    },

    methods: {

        async getMicrophone() {

            const userMedia = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            return new MediaRecorder(userMedia);

        },

        async openMicrophone() {

            await this.microphone.start(500);

            this.microphone.onstart = () => {
                console.log("client: microphone opened");
                document.body.classList.add("recording");
            };

            this.microphone.onstop = () => {
                console.log("client: microphone closed");
                document.body.classList.remove("recording");
            };

            this.microphone.ondataavailable = (e) => {
                console.log("client: sent data to websocket");
                this.socket.send(e.data);
            };
        },

        async closeMicrophone() {
            this.microphone.stop();
        },

        async start() {
            if (!this.microphone) {
                // open and close the microphone
                this.microphone = await this.getMicrophone();
                await this.openMicrophone();
            } else {
                await this.closeMicrophone();
                this.microphone = null;
            }
        },


        init() {

            let vm = this

            vm.socket = new WebSocket('wss://deepgram-test-qw7lwc6szq-uw.a.run.app/listen');

            vm.socket.addEventListener("open", async () => {
                vm.connected = true;
                console.log("WebSocket is open.");
                await vm.start();
            });

            vm.socket.addEventListener("message", (event) => {
                const message = event.data;
                console.log("Received message:", message);

                if (!vm.callingTextToAudioApi) {
                    vm.callingTextToAudioApi = true

                    vm.processTestResponse(message)

                }

                vm.text = vm.text + ' \n \n' + message
                // Handle the incoming message as needed
            });


            vm.socket.addEventListener("transcript-completed", () => {
                alert('SILENCE WAS DETECTED')
            });

            vm.socket.addEventListener("transcript", (event) => {
                const message = event.data;
                //console.log("transcript:", message);

                console.log(message)

                // Handle the incoming message as needed
            });

            vm.socket.addEventListener("close", () => {
                vm.connected = false;
                console.log("WebSocket is closed.");
            });

        },

        processTestResponse(text) {

            const vm = this

            let botId = '3ffd8b2d-2f2d-4a9f-9547-afebc50e384a';
            let userEmail = 'fusionbit.in@gmail.com'

            vm.socket2 = new WebSocket('wss://mebot-api.fusionbit.in/ws');
            vm.socket2.binaryType = 'arraybuffer';

            vm.socket2.addEventListener("open", async () => {

                console.log("TEXT to AUDIO WebSocket endpoint is open now.");

                vm.socket2.send(JSON.stringify({
                    query: "hi how are you?",
                    botId: botId,
                    userEmail: userEmail
                }));

            });

            //vm.socket2.onmessage = vm.handleAudioData;

            vm.socket2.addEventListener("message", async (event) => {

                console.log(event.data)

                const arrayBuffer = new Uint8Array(event.data).buffer;
                await this.playAudioData(arrayBuffer);

            });

            vm.socket2.addEventListener("close", () => {
                console.log("WebSocket is closed.");
            });


        },

        async playAudioData(arrayBuffer) {

            const vm = this

            if (vm.audioBufferSourceNode) {
                vm.audioBufferSourceNode.stop();
                vm.audioBufferSourceNode = null;
            }

            await vm.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                vm.audioBufferSourceNode = vm.audioContext.createBufferSource();
                vm.audioBufferSourceNode.buffer = buffer;
                vm.audioBufferSourceNode.connect(vm.audioContext.destination);
                vm.audioBufferSourceNode.start();
            });
        },

        async handleAudioData(event) {
            const audioData = event.data;

            this.audioStack.push(audioData);

            await this.playAudioChunk(audioData);


            // this.audioBuffer = this.concatenateUint8Arrays(this.audioBuffer, audioData);
            //
            // console.log(this.audioBuffer.length + " > " + 1024)
            //
            // if (this.audioBuffer.length > 1024) {
            //     console.log("Now Playing a chunk of audio")
            //
            //     await this.playAudioChunk(this.audioBuffer);
            //
            //     this.audioBuffer = new Uint8Array();
            //     console.log("Played a chunk")
            // }

        },

        concatenateUint8Arrays(arr1, arr2) {
            console.log("concatenateUint8Arrays")
            const result = new Uint8Array(arr1.length + arr2.length);
            result.set(arr1, 0);
            result.set(arr2, arr1.length);
            return result;
        },

        async playAudioChunk(buffer) {

            const vm = this

            console.log("Inside playAudioChunk method")
            return new Promise((resolve) => {
                console.log("decodeAudioData")
                vm.audioContext.decodeAudioData(buffer, (audioBuffer) => {
                    console.log("DECODING SUCCESSFUL")
                    const source = vm.audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(vm.audioContext.destination);
                    source.onended = () => {
                        console.log("Playing ended freeing resources")
                        source.disconnect()
                        source.buffer = null
                        resolve();
                    };
                    console.log("Now Playing...")
                    source.start();
                }, (error) => {
                    console.error('Error decoding audio:', error);
                    resolve();
                });
            });
        },


    },

    mounted() {

        //this.init()

        this.processTestResponse('Hi, how are you?')

    }

}


</script>

