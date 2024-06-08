import { Mic } from "@winston/ui";
import { Toggle } from "@winston/ui/toggle";
import { useRef, useState } from "react";

export const AudioRecorder = () => {
	const [recordedUrl, setRecordedUrl] = useState("");
	const mediaRecorderRef = useRef<MediaRecorder | undefined>(undefined);
	const chunks = useRef<Array<Blob>>([]);

	const startRecording = async () => {
		// get permission to record
		const stream = await navigator.mediaDevices
			.getUserMedia({ audio: true })
			.catch(() => {
				// ignore since it's from user not allowing microphone access
			});
		if (!stream) {
			return;
		}

		const mediaRecorder = new MediaRecorder(stream);
		mediaRecorderRef.current = mediaRecorder;

		mediaRecorder.ondataavailable = (e) => {
			if (e.data.size > 0) {
				// Do transcription here.
				chunks.current.push(e.data);
				const recordedBlob = new Blob(chunks.current, { type: "audio/webm" });
				const url = URL.createObjectURL(recordedBlob);
				setRecordedUrl(url);
			}
		};

		const requestData = () => {
			if (mediaRecorder.state !== "recording") {
				return;
			}
			mediaRecorder.requestData();
		};
		const interval = setInterval(() => {
			requestData();
		}, 1000); // one second

		mediaRecorder.onstop = () => {
			chunks.current = [];
			clearInterval(interval);
			for (const track of stream.getTracks()) {
				track.stop();
			}
		};

		mediaRecorder.start();
	};

	const stopRecording = () => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state === "recording"
		) {
			mediaRecorderRef.current.stop();
		}
	};

	const [isRecording, setIsRecording] = useState(false);

	const onToggle = (pressed: boolean) => {
		if (pressed) {
			startRecording();
		} else {
			stopRecording();
		}
		setIsRecording(pressed);
	};

	let enableToggleText = "Enable voice shortcut";
	if (isRecording) {
		enableToggleText = "Disable voice shortcut";
	}

	return (
		<div className="w-fit">
			<audio controls src={recordedUrl} />
			<Toggle
				aria-label="Toggle voice shortcut"
				className="gap-1"
				size={"sm"}
				pressed={isRecording}
				onPressedChange={onToggle}
			>
				<Mic size={17} /> {enableToggleText}
			</Toggle>
		</div>
	);
};
