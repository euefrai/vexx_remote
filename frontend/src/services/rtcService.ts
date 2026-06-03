export function createPeerConnection({
  onTrack,
  onIceCandidate,
}: {
  onTrack: (event: RTCTrackEvent) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
}) {
  const connection = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  });

  connection.ontrack = onTrack;
  connection.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  connection.onconnectionstatechange = () => {
    console.debug('RTC connection state:', connection.connectionState);
  };

  return connection;
}
