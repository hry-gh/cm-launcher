import { useEffect, useState } from "react";

declare const BYOND: {
	winset: (window: string, params: Record<string, string>) => Promise<void>;
	winget: (
		window: string,
		param: string,
	) => Promise<{ size: { x: number; y: number } }>;
	command: (cmd: string) => void;
};

declare global {
	interface Window {
		launcherData?: { ckey?: string };
		createApp: () => void;
	}
}

interface LauncherDataUpdateEvent extends CustomEvent {
	detail: { ckey?: string };
}

const GAME_STATES: Record<number, string> = {
	0: "Starting",
	1: "Lobby",
	2: "Setting Up",
	3: "Playing",
	4: "Finished",
};

interface Relay {
	id: string;
	name: string;
	host: string;
}

interface RelayWithPing extends Relay {
	ping: number | null;
	checking: boolean;
}

interface ServerData {
	round_id: number;
	mode: string;
	map_name: string;
	round_duration: number;
	gamestate: number;
	players: number;
}

interface Server {
	name: string;
	url: string;
	status: string;
	data?: ServerData;
}

const RELAYS: Relay[] = [
	{ id: "direct", name: "Direct", host: "direct.cm-ss13.com" },
	{ id: "nyc", name: "NYC", host: "nyc.cm-ss13.com" },
	{ id: "uk", name: "UK", host: "uk.cm-ss13.com" },
	{ id: "eu-e", name: "EU East", host: "eu-e.cm-ss13.com" },
	{ id: "eu-w", name: "EU West", host: "eu-w.cm-ss13.com" },
	{ id: "aus", name: "Australia", host: "aus.cm-ss13.com" },
	{ id: "us-e", name: "US East", host: "us-e.cm-ss13.com" },
	{ id: "us-w", name: "US West", host: "us-w.cm-ss13.com" },
	{ id: "asia-se", name: "SE Asia", host: "asia-se.cm-ss13.com" },
];

const PING_PORT = 4000;
const PING_COUNT = 10;

function pingRelay(host: string): Promise<number | null> {
	return new Promise((resolve) => {
		const socket = new WebSocket(`wss://${host}:${PING_PORT}`);
		const pingsSent: Record<string, number> = {};
		const pingTimes: number[] = [];
		let resolved = false;

		const timeout = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				socket.close();
				resolve(null);
			}
		}, 5000);

		socket.addEventListener("message", (event) => {
			pingTimes.push(Date.now() - pingsSent[event.data]);
			ping(Number(event.data) + 1);
		});

		socket.addEventListener("open", () => {
			ping(1);
		});

		socket.addEventListener("error", () => {
			if (!resolved) {
				resolved = true;
				clearTimeout(timeout);
				socket.close();
				resolve(null);
			}
		});

		const ping = (iter: number) => {
			if (iter > PING_COUNT) {
				if (!resolved) {
					resolved = true;
					clearTimeout(timeout);
					socket.close();
					const avgPing = Math.round(
						pingTimes.reduce((a, b) => a + b) / pingTimes.length,
					);
					resolve(avgPing);
				}
			} else {
				pingsSent[String(iter)] = Date.now();
				socket.send(String(iter));
			}
		};
	});
}

function formatDuration(deciseconds: number | undefined): string {
	if (!deciseconds) return "--:--:--";
	const totalSeconds = Math.floor(deciseconds / 10);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

interface ServerItemProps {
	server: Server;
	selectedRelay: string;
	relays: RelayWithPing[];
}

function ServerItem({ server, selectedRelay, relays }: ServerItemProps) {
	const relay = relays.find((r) => r.id === selectedRelay);
	const connectUrl = relay
		? `byond://${relay.host}:${server.url.split(":")[1]}`
		: null;

	const isOnline = server.status === "available";
	const data = server.data;

	return (
		<div className="server-item">
			<div className="server-info">
				<div className="server-name">{server.name}</div>
				{isOnline && data ? (
					<div className="server-details">
						<span>Round #{data.round_id}</span>
						<span>{data.mode}</span>
						<span>{data.map_name}</span>
						<span>{formatDuration(data.round_duration)}</span>
						<span>{GAME_STATES[data.gamestate] || "Unknown"}</span>
					</div>
				) : (
					<div className="server-details">
						<span>Server unavailable</span>
					</div>
				)}
			</div>
			<div className="server-status">
				<div
					className={`status-indicator ${!isOnline ? "offline" : ""}`}
				/>
				<div className="player-count">
					{isOnline && data ? data.players : "--"}
				</div>
				{isOnline && connectUrl ? (
					<a href={connectUrl} className="button">
						Connect
					</a>
				) : (
					<button type="button" className="button" disabled>
						Connect
					</button>
				)}
			</div>
		</div>
	);
}

function Titlebar() {
	const handleMinimize = () => {
		BYOND.winset("main", { "is-minimized": "true" });
	};

	const handleClose = () => {
		BYOND.command(".quit");
	};

	return (
		<div className="titlebar">
			<div className="titlebar-title">CM-SS13 Launcher</div>
			<div className="titlebar-buttons">
				<button
					type="button"
					className="titlebar-button"
					onClick={handleMinimize}
				>
					<span className="titlebar-icon">−</span>
				</button>
				<button
					type="button"
					className="titlebar-button titlebar-close"
					onClick={handleClose}
				>
					<span className="titlebar-icon">×</span>
				</button>
			</div>
		</div>
	);
}

function App() {
	const [servers, setServers] = useState<Server[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [ckey, setCkey] = useState<string | null>(
		window.launcherData?.ckey || null,
	);
	const [relays, setRelays] = useState<RelayWithPing[]>(
		RELAYS.map((r) => ({ ...r, ping: null, checking: true })),
	);
	const [selectedRelay, setSelectedRelay] = useState("direct");
	const [relayDropdownOpen, setRelayDropdownOpen] = useState(false);

	useEffect(() => {
		const handleDataUpdate = (e: Event) => {
			const event = e as LauncherDataUpdateEvent;
			if (event.detail.ckey !== undefined) {
				setCkey(event.detail.ckey);
			}
		};
		window.addEventListener("launcherDataUpdate", handleDataUpdate);
		return () =>
			window.removeEventListener("launcherDataUpdate", handleDataUpdate);
	}, []);

	useEffect(() => {
		const checkAllRelays = async () => {
			const results = await Promise.all(
				RELAYS.map(async (relay) => {
					const ping = await pingRelay(relay.host);
					return { ...relay, ping, checking: false };
				}),
			);
			results.sort((a, b) => {
				if (a.ping === null && b.ping === null) return 0;
				if (a.ping === null) return 1;
				if (b.ping === null) return -1;
				return a.ping - b.ping;
			});
			setRelays(results);
			const bestRelay = results.find((r) => r.ping !== null);
			if (bestRelay) {
				setSelectedRelay(bestRelay.id);
			}
		};
		checkAllRelays();
	}, []);

	useEffect(() => {
		const adjustForDPI = async () => {
			const dpi = window.devicePixelRatio;
			const { size } = await BYOND.winget("main", "size");

			const newWidth = Math.round(size.x * dpi);
			const newHeight = Math.round(size.y * dpi);

			const screenWidth = window.screen.width * dpi;
			const screenHeight = window.screen.height * dpi;
			const posX = Math.round((screenWidth - newWidth) / 2);
			const posY = Math.round((screenHeight - newHeight) / 2);

			await BYOND.winset("main", {
				size: `${newWidth}x${newHeight}`,
				pos: `${posX},${posY}`,
			});
		};

		adjustForDPI();
	}, []);

	useEffect(() => {
		const fetchServers = async () => {
			try {
				setLoading(true);
				const response = await fetch(
					"https://db.cm-ss13.com/api/Round",
				);
				if (!response.ok) {
					throw new Error(`HTTP error: ${response.status}`);
				}
				const data = await response.json();
				setServers(data.servers || []);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		};

		fetchServers();
		const interval = setInterval(fetchServers, 30000);
		return () => clearInterval(interval);
	}, []);

	return (
		<>
			<div className="crt" />

			<div className="launcher">
				<Titlebar />

				<main className="main-content">
					<section className="section servers-section">
						<div className="server-list">
							{loading && servers.length === 0 && (
								<div className="server-loading">
									Loading servers...
								</div>
							)}
							{error && (
								<div className="server-error">
									Error: {error}
								</div>
							)}
							{servers.map((server, index) => (
								<ServerItem
									key={server.name || index}
									server={server}
									selectedRelay={selectedRelay}
									relays={relays}
								/>
							))}
						</div>
					</section>
				</main>

				<footer className="section footer">
					<div className="account-info">
						<div className="account-avatar">
							{ckey ? ckey.substring(0, 2).toUpperCase() : "??"}
						</div>
						<div className="account-details">
							<div className="account-name">
								{ckey || "Not logged in"}
							</div>
							<div className="account-status">
								{ckey
									? "BYOND Account Connected"
									: "Awaiting authentication..."}
							</div>
						</div>
					</div>
					<div className="relay-dropdown">
						<button
							type="button"
							className="relay-dropdown-button"
							onClick={() =>
								setRelayDropdownOpen(!relayDropdownOpen)
							}
						>
							<span className="relay-dropdown-label">Relay:</span>
							<span className="relay-dropdown-value">
								{relays.find((r) => r.id === selectedRelay)
									?.name || "Select"}
							</span>
							<span className="relay-dropdown-arrow">
								{relayDropdownOpen ? "▲" : "▼"}
							</span>
						</button>
						{relayDropdownOpen && (
							<div className="relay-dropdown-menu">
								{relays.map((relay) => (
									<label
										key={relay.id}
										className={`relay-option ${selectedRelay === relay.id ? "selected" : ""} ${relay.ping === null && !relay.checking ? "disabled" : ""}`}
									>
										<input
											type="radio"
											name="relay"
											value={relay.id}
											checked={selectedRelay === relay.id}
											onChange={() => {
												setSelectedRelay(relay.id);
												setRelayDropdownOpen(false);
											}}
											disabled={
												relay.ping === null &&
												!relay.checking
											}
										/>
										<span className="relay-name">
											{relay.name}
										</span>
										<span className="relay-ping">
											{relay.checking
												? "..."
												: relay.ping !== null
													? `${relay.ping}ms`
													: "N/A"}
										</span>
									</label>
								))}
							</div>
						)}
					</div>
				</footer>
			</div>
		</>
	);
}

export default App;
