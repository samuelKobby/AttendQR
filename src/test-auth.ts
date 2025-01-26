import { authService } from './services/auth';

async function testSignUps() {
  try {
    // Test Admin Signup
    console.log('Testing Admin Signup...');
    const adminResult = await authService.signUp({
      email: 'admin@test.com',
      password: 'admin123456',
      full_name: 'Test Admin',
      role: 'admin'
    });
    console.log('Admin signup successful:', adminResult);

    // Test Lecturer Signup
    console.log('\nTesting Lecturer Signup...');
    const lecturerResult = await authService.signUp({
      email: 'lecturer@test.com',
      password: 'lecturer123456',
      full_name: 'Test Lecturer',
      role: 'lecturer'
    });
    console.log('Lecturer signup successful:', lecturerResult);

    // Test Student Signup
    console.log('\nTesting Student Signup...');
    const studentResult = await authService.signUp({
      email: 'student@test.com',
      password: 'student123456',
      full_name: 'Test Student',
      role: 'student'
    });
    console.log('Student signup successful:', studentResult);

  } catch (error) {
    console.error('Error during signup tests:', error);
  }
}

// Run the tests
testSignUps();
