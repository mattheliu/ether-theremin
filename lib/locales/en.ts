import type { Locale } from './zh';

export const en = {
  ui: {
    chooseMicrophone: 'Microphone',
    autoMicrophone: 'Automatic, prefer built-in microphone',
    microphoneHelp:
      'After granting permission, select a physical input such as MacBook Pro Microphone. Avoid virtual inputs such as Cast Audio or Loopback.',
    trackMuted: 'Microphone track muted',
    trackEnabled: 'Microphone track enabled',
    audioState: 'Audio engine state',
    running: 'Running',
    suspended: 'Suspended',
    closed: 'Closed',
    interrupted: 'Interrupted',
    compatibility: 'Compatibility band',
    compatibilityHelp:
      'If high-frequency calibration fails, also test 16 to 18 kHz. You may hear a high-pitched tone. Start with low system volume and stop if uncomfortable.',
    probeHelp:
      'System volume and Probe level control the sensing tone. Output volume only controls the musical sound.',
    diagnosticsTitle: 'Sonar calibration diagnostics',
    diagnosticsEmpty:
      'Start sonar to see the actual microphone and frequency measurements here.',
    inputDevice: 'Actual microphone',
    inputRate: 'Microphone sample rate',
    contextRate: 'Processing sample rate',
    inputLevel: 'Highest input level this run',
    echoCancellation: 'Echo cancellation',
    noiseSuppression: 'Noise suppression',
    autoGainControl: 'Automatic gain',
    enabled: 'On',
    disabled: 'Off',
    unknown: 'Not reported by browser',
    testingFrequency: 'Testing',
    frequency: 'Probe frequency',
    receivedLevel: 'Received level',
    rise: 'Rise over background',
    snr: 'Signal to noise',
    stable: 'Stable frames',
    result: 'Result',
    usable: 'Usable',
    insufficient: 'Insufficient',
    diagnosticsHelp:
      'Measurements stay in this page. Levels are digital audio values, not perceived loudness. “Off” describes the browser setting; macOS or device processing may still apply.',
    macHelp:
      'On Mac: in System Settings → Sound, select the built-in input and output. While the microphone is in use, check Mic Mode in the menu bar and turn off Voice Isolation.',
    macHelpLink: 'Apple Mic Modes guide',
    title: 'ETHER · Sonar Theremin',
    play: 'Play',
    history: 'Origins',
    language: 'Interface language',
    theme: 'Switch light or dark theme',
    heading: 'Untouched.\nYet heard.',
    subtitle: 'Sonar theremin',
    intro:
      'Speakers send a tone. A microphone hears its echo.\nMove your hand and give the air a melody.',
    artAlt:
      'A hovering hand beside a silver theremin antenna, surrounded by delicate trails of light',
    artCredit: 'An impression of sound · AI artwork',
    console: 'Theremin instrument',
    modes: 'Playing mode',
    sonar: 'Sonar',
    touch: 'Touch backup',
    playing: 'Playing',
    calibrating: 'Calibrating',
    standby: 'Standby',
    spectrum: 'Live echo spectrum',
    touchField: 'Touch playing field',
    pitch: 'Current pitch',
    sonarAria:
      'Sonar echo spectrum. Start sonar, then move your palm toward and away from the speakers. Escape stops.',
    touchAria:
      'Playing field. Hold and move horizontally for pitch, vertically for volume. Hold Space and use arrow keys to play. Escape stops.',
    invitation: 'A gesture becomes a melody',
    touchInvitation: 'Trace a sound with your fingertips',
    wait: 'Keep your hand and computer still during calibration',
    hardware: 'Use your computer’s built-in speakers and microphone',
    touchHint: 'Start playing, then press and glide here',
    echo: 'Echo level',
    volumeAxis: 'Volume',
    away: '−500 Hz / away',
    carrier: 'Carrier',
    toward: '+500 Hz / toward',
    stop: 'Stop playing',
    cancel: 'Cancel',
    startSonar: 'Start sonar',
    start: 'Start playing',
    escape: 'to stop anytime',
    tone: 'Tone',
    classic: 'Classic',
    pure: 'Sine',
    hollow: 'Hollow',
    volume: 'Output volume',
    glide: 'Glide',
    reverb: 'Reverb',
    quantize: 'Scale assist',
    major: 'C major',
    free: 'Free pitch',
    touchInstruction:
      'Hold the field. Move sideways for pitch and vertically for volume. Release to fade out. You can also hold Space and use the arrow keys.',
    response: 'Playing response',
    melodyMode: 'Melody',
    gestureMode: 'Gesture',
    melodyHelp:
      'Move toward to rise, away to fall. Hold a note for 2.2 seconds at rest, then fade gently. Range C4–C5; use small movements.',
    gestureHelp:
      'Full C3–C6 range, faster response, and a quick fade when you stop moving.',
    pentatonic: 'C pentatonic',
    scaleLabel: 'Scale',
    rest: 'End note',
    restHelp: 'End this note; move again to continue. Sonar stays on.',
    coachTitle: 'Listen. Then play a little phrase.',
    coachIntro:
      'Original phrase · demo at 80 BPM. Practice at your pace: reach the highlighted note and hold for about half a second to advance.',
    listenPhrase: 'Listen',
    stopDemo: 'Stop demo',
    practice: 'Follow along',
    practiceAgain: 'Try again',
    finishPractice: 'End practice',
    coachReady:
      'Listen first, then start sonar. Practice enables Melody response and C pentatonic.',
    practiceStart: 'Start sonar, then play the highlighted note.',
    practiceHigher: 'Move gently toward the speakers to reach the note.',
    practiceLower: 'Move gently away from the speakers to reach the note.',
    practiceHold: 'Keep this note steady for a moment.',
    practiceSound: 'Move gently to sound this note.',
    practiceDone:
      'Phrase complete. Try again and connect the notes more gently.',
    demoHelp:
      'The demo plays music without using the microphone. Stop playing before listening.',
    targetNote: 'Target note',
    gestureTitle: 'Stillness. Then movement.',
    gestureInstruction:
      'Allow microphone access and stay still for calibration. Move toward the speakers to raise the pitch, away to lower it. The sound fades when you stop moving.',
    probe: 'Probe level',
    sensitivity: 'Sensitivity',
    signal: 'Motion signal',
    waiting: 'Awaiting calibration',
    recalibrate: 'Recalibrate',
    recalibrateAria: 'Recalibrate sonar',
    sonarNote:
      'Use built-in speakers, without headphones. Recalibrate after changing the probe level. Microphone audio stays on your device; nothing is recorded or uploaded. Some people and pets can hear high frequencies. Stop if uncomfortable.',
    originHeading: 'Two hands.\nA century of echoes.',
    originIntro:
      'Before keyboards and synthesizers became familiar, an instrument with no strings and no physical contact was already bringing electronic sound to the stage.',
    inventionTitle: 'Born in a physics laboratory',
    invention:
      'Around 1920, Russian inventor Lev Termen, known as Léon Theremin, created the instrument that would bear his name.',
    patentTitle: 'A new way to make sound',
    patent:
      'On February 28, 1928, Theremin received US patent US1661058A for his method and apparatus for generating sounds.',
    rcaTitle: 'Beyond the laboratory',
    rca: 'RCA commercialized the theremin in 1929. Two antennas extend from a wooden cabinet, with one hand controlling pitch and the other volume.',
    rcaAlt:
      'An RCA theremin from around 1930, with a wooden cabinet, vertical pitch antenna and loop volume antenna',
    rcaCaption: 'RCA Victor theremin, 1929 to 1930',
    photoCredit: 'Photograph: David Thompson / Museums Victoria',
    museum: 'View the collection',
    artistTitle: 'The musician who made it sing',
    artist:
      'Clara Rockmore developed precise aerial fingering, shaping continuous glides into clear notes and phrases and expanding the theremin’s expressive role in classical music.',
    artistLink: 'Discover Clara Rockmore',
    connectionHeading: 'From electric fields to echoes.',
    connection:
      'A traditional theremin senses position through changes in capacitance between hands and antennas. This browser instrument borrows its flowing pitch, using Doppler echoes to sense movement: toward raises the pitch, away lowers it.',
    limitation:
      'It senses motion, not absolute distance, and cannot track two hands independently. Sonar response depends on your speakers, microphone and room reflections.',
    sourceLabel: 'Research & implementation',
    lowVolume: 'Start quietly. Listen for the smallest change.',
    back: 'Back to playing',
    foundation: 'Bob Moog Foundation',
    patentLink: 'Original patent',
    navigation: 'Page navigation',
    inventionDate: 'c. 1920',
    description:
      'Move your hand and give the air a melody. ETHER is a bilingual sonar theremin using your speakers and microphone to sense gestures, with a brief history of the instrument.',
  },
  messages: {
    melodyCalibrated:
      'Calibrated. Move gently to change pitch; rest to hold for 2.2 seconds. Try the eight-note phrase below.',
    melodyPlaying:
      'Move gently toward to rise, away to fall. Rest to sustain; End note silences this phrase.',
    demoPlaying:
      'Playing the eight-note demo without a microphone. Escape stops anytime.',
    demoFinished: 'Demo finished. Start sonar and try the phrase yourself.',
    inputChanged: 'The microphone or probe band changed. Start sonar again.',
    virtualInput:
      'The selected input is a virtual audio device and cannot directly hear sound in the room. Select the built-in microphone. If only virtual devices are listed, open this page in Chrome or Safari on your Mac.',
    sampleRateTooLow:
      'The microphone sample rate is too low for this band. Use the built-in microphone and disconnect Bluetooth headsets or voice-call mode.',
    inputSilent:
      'The microphone input is nearly silent. Check the input device, input volume and hardware mute, then recalibrate.',
    processingEnabled:
      'Echo cancellation or noise suppression is still on and may filter the probe. Turn off Voice Isolation or audio enhancements, then recalibrate.',
    probeMissing:
      'The microphone receives audio, but neither band has a stable probe. Check system speaker volume, the output device and microphone mode. See diagnostics below.',
    highBandMissing:
      'The microphone receives audio, but the high-frequency probe is insufficient. Check system speaker volume and output routing, or enable the compatibility band below.',
    sonarReady:
      'Use built-in speakers. Start sonar, allow the microphone, and stay still.',
    touchReady: 'Start playing, then press and glide across the field.',
    paused: 'Paused. Start again to continue playing.',
    requestMicrophone: 'Allow microphone access to calibrate sonar.',
    startingAudio: 'Starting audio…',
    touchPlaying:
      'Hold the field. Move sideways for pitch and vertically for volume.',
    permissionDenied:
      'Microphone access was denied. Allow it in your browser or use touch mode.',
    microphoneMissing: 'No microphone found. Connect one or use touch mode.',
    microphoneBusy:
      'The microphone is busy. Close the other audio app and try again.',
    startFailed: 'Unable to start. Try again or switch to touch mode.',
    insecureContext:
      'Microphone access is unavailable here. Open this page over HTTPS or localhost.',
    microphoneDisconnected:
      'Microphone disconnected. Reconnect it and start sonar again.',
    searchingEcho: 'Searching for a clear echo…',
    measuringBackground: 'Stay still while the background signal is measured…',
    calibrated:
      'Calibrated. Move toward to raise pitch, away to lower it. Stay still to fade out.',
    signalLost:
      'Sonar signal lost. Check the speakers and microphone, then restart.',
    noGesture:
      'No gesture detected. Move your palm 10 to 30 cm above the speakers, or recalibrate.',
    sonarPlaying:
      'Move toward to raise pitch, away to lower it. Stay still to fade out.',
    stopped: 'Stopped. Start again when you are ready.',
    inputUnavailable:
      'The selected microphone is no longer available. Select another input and start sonar again.',
  },
} satisfies Locale;
