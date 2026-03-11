const { exec } = require("child_process");
const path = require("path");

const player = require("play-sound")({
    player: "C:\\Program Files\\MPV Player\\mpv.com",
    args: ["--really-quiet"],
});

// ==========================================
// CONFIGURATION
// ==========================================
const FOCUS_TIME = 1; // 1 Menit
const REST_TIME = 5;      // 15 Detik
// ==========================================

const soundFokus = path.join(__dirname, "sound", "hey.mp3");
const soundIstirahat = path.join(__dirname, "sound", "break.mp3");
const gifIstirahat = path.join(__dirname, "gif", "break.gif");

let totalSet = parseInt(process.argv[2]) || 1;
let setSekarang = 1;
let sedangFokus = true;
let sisaWaktu = FOCUS_TIME;
let timerHandle = null;

function mulaiSesiIstirahat() {
    if (!sedangFokus) {
        const mpv = `"C:\\Program Files\\MPV Player\\mpv.com"`;
        const gif = `"${gifIstirahat}"`;

        // Kita pakai argumen -w 0 (jendela saat ini) 
        // Dan split-pane -V (Vertical)
        // Kita juga tambahkan --size 0.5 sesuai request kamu
        const perintahWt = `wt -w 0 split-pane -V --size 0.5 --title "BREAK_GIF" ${mpv} --vo=tct --loop=inf --no-audio --really-quiet ${gif}`;

        exec(perintahWt, (err) => {
            if (err) {
                // Fallback kalau gagal
                const fallback = `start "" ${mpv} --vo=tct --loop=inf --no-audio --really-quiet --terminal=yes ${gif}`;
                exec(fallback);
            }
        });

        putarLaguLoop();
    }
}

function bersihkanMPV(callback) {
    // Matikan MPV (.exe & .com) biar sesi istirahat berhenti
    exec("taskkill /F /IM mpv.exe /T & taskkill /F /IM mpv.com /T", () => {
        if (callback) callback();
    });
}

process.on("SIGINT", () => {
    console.log("\n[Clean Up] Mematikan semua sesi MPV...");
    bersihkanMPV(() => process.exit());
});

process.on("exit", () => {
    exec("taskkill /F /IM mpv.exe /T & taskkill /F /IM mpv.com /T");
});

function putarLaguLoop() {
    if (!sedangFokus) {
        player.play(soundIstirahat, { mpv: ["--no-video"] }, (err) => {
            if (!err && !sedangFokus) putarLaguLoop();
        });
    }
}

function jalankanTimer() {
    timerHandle = setInterval(() => {
        const m = Math.floor(sisaWaktu / 60);
        const s = sisaWaktu % 60;
        const displayWaktu = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        if (sedangFokus) {
            console.clear();
            console.log(`===================================`);
            console.log(` SET: ${setSekarang} / ${totalSet}`);
            console.log(` STATUS: 🔴 FOKUS`);
            console.log(` SISA WAKTU: ${displayWaktu}`);
            console.log(`===================================`);
        } else {
            // ANSI escape untuk update timer tanpa flicker
            process.stdout.write(
                `\x1b[H\x1b[K\x1b[32m 🟢 ISTIRAHAT | Sisa Waktu: ${displayWaktu} \x1b[0m\n`,
            );
        }

        if (sisaWaktu <= 0) {
            pindahState();
        } else {
            sisaWaktu--;
        }
    }, 1000);
}

function pindahState() {
    clearInterval(timerHandle);

    if (sedangFokus) {
        console.log("\nSesi fokus beres! Memutar notifikasi...");
        player.play(soundFokus, (err) => {
            sedangFokus = false;
            sisaWaktu = REST_TIME;
            console.clear(); 
            mulaiSesiIstirahat();
            jalankanTimer();
        });
    } else {
        sedangFokus = true;

        bersihkanMPV(() => {
            setTimeout(() => {
                if (setSekarang < totalSet) {
                    setSekarang++;
                    sisaWaktu = FOCUS_TIME;
                    console.clear(); 
                    jalankanTimer();
                } else {
                    console.clear();
                    console.log("\n🔥 SEMUA SET SELESAI! MANTAP BRO! 🔥");
                    process.exit();
                }
            }, 500);
        });
    }
}

jalankanTimer();