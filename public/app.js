'use strict';

const learnjs = {
	poolId: 'ap-northeast-1:4841ca7b-3a2b-4270-8636-c808a79e545d'
};

//問題の配列
learnjs.problems = [{
		description: "What is truth?",
		code: "function problem() { return __; }"
	},
	{
		description: "Simple Math",
		code: "function problem() { return 42 === 6 * __; }"
	}
];

learnjs.identity = new $.Deferred();

learnjs.applyObject = function (obj, elem) {
	for (const key in obj) {
		elem.find('[data-name="' + key + '"]').text(obj[key]);
	}
};

learnjs.landingView = function () {
	return learnjs.template('landing-view');
};

learnjs.problemView = function (data) {
	const problemNumber = parseInt(data, 10);
	const view = $('.templates .problem-view').clone();
	const problemData = learnjs.problems[problemNumber - 1];
	const resultFlash = view.find('.result');

	function checkAnswer() {
		const answer = view.find('.answer').val();
		const test = problemData.code.replace('__', answer) + '; problem();';
		return eval(test);
	}

	function chekAnswerClick() {
		if (checkAnswer()) {
			const correctFlash = learnjs.buildCorrectFlash(problemNumber);
			learnjs.flashElement(resultFlash, correctFlash);
		} else {
			learnjs.flashElement(resultFlash, 'Incorrect!');
		}
		return false;
	}

	view.find('.check-btn').click(chekAnswerClick);
	view.find('.title').text('Problem #' + problemNumber);
	learnjs.applyObject(problemData, view);
	if (problemNumber < learnjs.problems.length) {
		const buttonItem = learnjs.template('skip-btn');
		buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1));
		$('.nav-list').append(buttonItem);
		view.bind('removingView', function () {
			buttonItem.remove();
		});
	}
	return view;
};

learnjs.showView = function (hash) {
	const routes = {
		'#problem': learnjs.problemView,
		'#profile': learnjs.profileView,
		'#': learnjs.landingView,
		'': learnjs.landingView
	};
	const hashParts = hash.split('-');
	const viewFn = routes[hashParts[0]];
	if (viewFn) {
		learnjs.triggerEvent('removingView', []);
		$('.view-container').empty().append(viewFn(hashParts[1]));
	}
};

learnjs.appOnReady = function () {
	window.onhashchange = function () {
		learnjs.showView(window.location.hash);
	};
	learnjs.showView(window.location.hash);
	learnjs.identity.done(learnjs.addProfileLink);
};

learnjs.flashElement = function (elem, content) {
	elem.fadeOut('false', function () {
		elem.html(content);
		elem.fadeIn();
	});
};

learnjs.template = function (name) {
	return $('.templates .' + name).clone();
};

learnjs.buildCorrectFlash = function (problemNum) {
	const correctFlash = learnjs.template('correct-flash');
	const link = correctFlash.find('a');
	if (problemNum < learnjs.problems.length) {
		link.attr('href', '#problem-' + (problemNum + 1));
	} else {
		link.attr('href', '');
		link.text("Yo're Finished!");
	}
	return correctFlash;
};

//view-container要素のすべての子にイベントをトリガーする
learnjs.triggerEvent = function (name, args) {
	$('.view-container>*').trigger(name, args);
};

// googleの認証後に呼び出すコールバック
function googleSignIn(googleUser) {
	window.console.log("googleSignIn");
	window.console.log(googleUser);
	const id_token = googleUser.getAuthResponse().id_token;
	AWS.config.update({
		region: 'ap-northeast-1',
		credentials: new AWS.CognitoIdentityCredentials({
			IdentityPoolId: learnjs.poolId,
			Logins: {
				'accounts.google.com': id_token
			}
		})
	});
	learnjs.awsRefresh().then(function (id) {
		window.console.log("learnjs.identity.resolve");
		learnjs.identity.resolve({
			id: id,
			email: googleUser.getBasicProfile().getEmail(),
			refresh: refresh
		});
	});
}

// アイデンティティトークンを更新する
function refresh() {
	window.console.log("refresh enter");
	return gapi.auth2.getAuthInstance().signIn({
		prompt: 'login'
	}).then(function (userUpdate) {
		window.console.log("refresh function");
		window.console.log(userUpdate);
		const creds = AWS.config.credentials;
		const newToken = userUpdate.getAuthResponse().id_token;
		creds.params.Logins['accounts.google.com'] = newToken;
		return learnjs.awsRefresh();
	});
}

learnjs.awsRefresh = function () {
	window.console.log("awsRefresh enter");
	const deferred = new $.Deferred();
	AWS.config.credentials.refresh(function (err) {
		window.console.log("refresh function");
		window.console.log(err);
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(AWS.config.credentials.identityId);
		}
	});
	window.console.log("awsRefresh before promise");
	return deferred.promise();
};

// profile-viewを作成する
learnjs.profileView = function () {
	const view = learnjs.template('profile-view');
	learnjs.identity.done(function (identity) {
		view.find('.email').text(identity.email);
	});
	return view;
};

learnjs.addProfileLink = function (profile) {
	const link = learnjs.template('profile-link');
	link.find('a').text(profile.email);
	$('.sign-bar').prepend(link);
};