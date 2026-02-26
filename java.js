const signIn = document.getElementById('sign-in');
const signUp = document.getElementById('sign-up');
const form = document.getElementById('form');

signIn.addEventListener('click', () => {
    form.classList.remove('toggle')
})
signUp.addEventListener('click', () => {
    form.classList.add('toggle')
})
