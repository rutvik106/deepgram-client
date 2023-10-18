<template>
    <div>
        <h1>DEEPGRAM</h1>
        <h5>START SPEAKING</h5>
        <p>{{ text }}</p>

    </div>

    <button @click="">Play</button>

</template>


<script>

export default {

    data() {
        return {
            audioContext: new (window.AudioContext || window.webkitAudioContext)(),
            audioQueue: [],
            audioBuffer: new Uint8Array(),
            isPlaying: false,
            minBufferLength: 1024 * 1, // Example size, may need adjustment

        };
    },

    methods: {

        processTestResponse(text) {

            const vm = this

            let botId = '3ffd8b2d-2f2d-4a9f-9547-afebc50e384a';
            let userEmail = 'fusionbit.in@gmail.com'

            vm.socket2 = new WebSocket('wss://mebot-api.fusionbit.in/text-to-audio-ws')
            vm.socket2.binaryType = 'arraybuffer'
            vm.socket2.addEventListener("open", () => {
                console.log("TEXT to AUDIO WebSocket endpoint is open now.");
                vm.socket2.send(JSON.stringify({
                    query: text,
                    botId: botId,
                    userEmail: userEmail
                }));
            });


            vm.socket2.addEventListener("message", (event) => {
                const vm = this
                console.log(event.data)

                const incomingData = new Uint8Array(event.data);
                this.audioBuffer = this.concatTypedArrays(this.audioBuffer, incomingData);

                if (this.audioBuffer.length >= this.minBufferLength) {
                    this.processBuffer();
                }

            });

            vm.socket2.addEventListener("close", () => {
                console.log("WebSocket is closed.");
            });


        },


        concatTypedArrays(a, b) {
            const c = new Uint8Array(a.length + b.length);
            c.set(new Uint8Array(a.buffer), 0); // Clone the old buffer to ensure it doesn't get detached
            c.set(b, a.length);
            return c;
        },

        async processBuffer() {
            try {
                const audioBuffer = await this.audioContext.decodeAudioData(this.audioBuffer.buffer);
                this.audioQueue.push(audioBuffer);

                // Remove the decoded data from the buffer (assuming it decodes all buffered data)
                this.audioBuffer = new Uint8Array();

                if (!this.isPlaying) {
                    this.playNextChunk();
                }
            } catch (error) {
                // Decoding failed, which might mean the buffer doesn't have a complete audio frame yet.
                // We can wait for more data or implement additional logic if needed.
            }
        },

        async playNextChunk() {
            if (this.audioQueue.length === 0) {
                this.isPlaying = false;
                return;
            }

            this.isPlaying = true;
            const audioBuffer = this.audioQueue.shift();

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.onended = this.playNextChunk;
            source.start();
        }
    },

    mounted() {


        this.processTestResponse('who is elon musk?')

    }

}


</script>

