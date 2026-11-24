const loginForm = document.querySelector('#login-form');
const usernameInput = document.querySelector('#username');
const passwordInput = document.querySelector('#password');
const togglePassword = document.querySelector('#toggle-password');
const formMessage = document.querySelector('#form-message');
const roleSelect = document.querySelector('#access-role');

togglePassword.addEventListener('click', () => {
  const showPassword = passwordInput.type === 'password';
  passwordInput.type = showPassword ? 'text' : 'password';
  togglePassword.setAttribute('aria-pressed', String(showPassword));
  togglePassword.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
  passwordInput.focus();
});

document.querySelector('#forgot-password').addEventListener('click', (event) => {
  event.preventDefault();
  formMessage.hidden = false;
  formMessage.textContent = 'La recuperación de contraseña se habilitará cuando se conecte el inicio de sesión real.';
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  formMessage.hidden = false;
  formMessage.textContent = '';

  if (!usernameInput.value.trim()) {
    formMessage.textContent = 'Escribe tu usuario o correo para continuar.';
    usernameInput.focus();
    return;
  }
  if (!passwordInput.value) {
    formMessage.textContent = 'Escribe tu contraseña para continuar.';
    passwordInput.focus();
    return;
  }
  try { sessionStorage.setItem('meditech-demo-role', roleSelect.value);
   localStorage.setItem('meditech-demo-role', roleSelect.value);
  } catch (error) { /* Solo es un dato temporal para la maqueta. */ }
});
