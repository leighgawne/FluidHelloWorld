/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SharedTree, TreeConfiguration, SchemaFactory, Tree } from "fluid-framework";
import { TinyliciousClient } from "@fluidframework/tinylicious-client";
import { AzureClient } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";

const user = { id: "userId", name: "userName" };

const config = {
  tenantId: "6a210ca7-069a-4f10-9165-24eff698785c",
  tokenProvider: new InsecureTokenProvider("D2VmOjpjxBUBnRuB0sBsjtJugRp6XgREgwK8PBBN50hbydT0M9fFJQQJ99AFACBkjD8y71xuAAAAAZFRnDU1", user),
  endpoint: "https://us.fluidrelay.azure.com",
  type: "remote",
};

const clientProps = {
  connection: config,
};

const client = new AzureClient(clientProps);


//const client = new TinyliciousClient();
const containerSchema = {
	initialObjects: { diceTree: SharedTree },
};

const root = document.getElementById("content");

// The string passed to the SchemaFactory should be unique
const sf = new SchemaFactory("fluidHelloWorldSample");

// Here we define an object we'll use in the schema, a Dice.
class Dice extends sf.object("Dice", {
	value: sf.number,
}) {}

// Here we define the tree schema, which has a single Dice object starting at 1.
// We'll call schematize() on the SharedTree using this schema, which will give us a tree view to work with.
const treeConfiguration = new TreeConfiguration(
	Dice,
	() =>
		new Dice({
			value: 1,
		}),
);

const createNewDice = async () => {
	const { container } = await client.createContainer(containerSchema);
	const dice = container.initialObjects.diceTree.schematize(treeConfiguration).root;
	const id = await container.attach();
	renderDiceRoller(dice, root);
	return id;
};

const loadExistingDice = async (id) => {
	const { container } = await client.getContainer(id, containerSchema);
	const dice = container.initialObjects.diceTree.schematize(treeConfiguration).root;
	renderDiceRoller(dice, root);
};

async function start() {
	if (location.hash) {
		await loadExistingDice(location.hash.substring(1));
	} else {
		const id = await createNewDice();
		location.hash = id;
	}
}

start().catch((error) => console.error(error));

// Define the view
const template = document.createElement("template");

template.innerHTML = `
  <style>
    .wrapper { text-align: center }
    .dice { font-size: 200px }
    .roll { font-size: 50px;}
  </style>
  <div class="wrapper">
    <div class="dice"></div>
    <button class="roll"> Roll </button>
  </div>
`;

const renderDiceRoller = (dice, elem) => {
	elem.appendChild(template.content.cloneNode(true));

	const rollButton = elem.querySelector(".roll");
	const diceElem = elem.querySelector(".dice");

	// Set the value at our dataKey with a random number between 1 and 6.
	rollButton.onclick = () => {
		dice.value = Math.floor(Math.random() * 6) + 1;
	};

	// Get the current value of the shared data to update the view whenever it changes.
	const updateDice = () => {
		const diceValue = dice.value;
		// Unicode 0x2680-0x2685 are the sides of a dice (⚀⚁⚂⚃⚄⚅)
		diceElem.textContent = String.fromCodePoint(0x267f + diceValue);
		diceElem.style.color = `hsl(${diceValue * 60}, 70%, 30%)`;
	};
	updateDice();

	// Use the changed event to trigger the rerender whenever the value changes.
	Tree.on(dice, "treeChanged", updateDice);
	// Setting "fluidStarted" is just for our test automation
	window.fluidStarted = true;
};
