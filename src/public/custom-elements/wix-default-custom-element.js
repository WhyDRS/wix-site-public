$w.onReady( function() {
	$w('#message').text = 'Hello World';
	$w('#button').label = 'Click Me';

	$w('#button').onClick ( () => {
		$w('#message').text = 'Hello from Velo!';
	} );
} );