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
            isPlaying: false,
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

                const audioData = new Uint8Array(event.data);
                this.audioQueue.push(audioData);
                if (!this.isPlaying) {
                    this.playNextChunk();
                }

            });

            vm.socket2.addEventListener("close", () => {
                console.log("WebSocket is closed.");
            });


        },


        async playNextChunk() {
            if (this.audioQueue.length === 0) {
                this.isPlaying = false;
                return;
            }

            this.isPlaying = true;
            const audioData = this.audioQueue.shift();

            try {
                const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.audioContext.destination);
                source.onended = this.playNextChunk;
                source.start();
            } catch (error) {
                console.error('Error decoding audio data', error);
            }
        }


    },

    mounted() {


        this.processTestResponse('Hi')

    }

}


</script>

