<svelte:options tag="svelte-app" />
<script>
	// import ripple from '../../node_modules/attractions/utils/ripple.js';
    // import eventsAction from '../../node_modules/attractions/utils/events.js';
	// import classes from '../../node_modules/attractions/utils/classes.js';
	export let id;
	export let name;
	export let lastname;
	let result = '';
	async function doSomething () {
		debugger
		const res = await fetch('', {
			method: 'POST',
			headers: {
                RequestVerificationToken: document.getElementsByName("__RequestVerificationToken")[0].value,
				'Content-Type': 'application/json; charset=utf-8;'
				/*,
                'Content-Type': 'application/json',
                Accept: 'application/json',*/
            },
			body:JSON.stringify({name, lastname})
			/*body: JSON.stringify({
				name,
				lastname
			})*/
		})
		const json = await res.json()
		result = JSON.stringify(json)
	}

	async function doPost () {
	
		const res = await fetch('', {
			method: 'POST',
			headers: {
                RequestVerificationToken: document.getElementsByName("__RequestVerificationToken")[0].value,
				'Content-Type': 'application/json; charset=utf-8;'
				/*,
                'Content-Type': 'application/json',
                Accept: 'application/json',*/
            },
			body:JSON.stringify({name, lastname})
			/*body: JSON.stringify({
				name,
				lastname
			})*/
		})
		const json = await res.json()
		result = JSON.stringify(json)
	}

</script>

<main>
	
	
    <h1 id="{id}">Your name is {name}!</h1>
	<h1 id="{id}">and lastname is {lastname}!</h1>

	<input bind:value={name} />
	<input bind:value={lastname} />
	<button type="button" on:click={doPost}>Post it.</button>
	<p>
		Result:
	</p>
	<pre>
	{result != undefined ? result: ''}
	</pre>
	
</main>

<style>
    h1 {
        font-size: 5em;
    }
</style>
