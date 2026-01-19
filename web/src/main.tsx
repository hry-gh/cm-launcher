import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

window.createApp = () => {
	ReactDOM.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
};

window.createApp();
