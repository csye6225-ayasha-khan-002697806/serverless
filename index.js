import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import sgMail from '@sendgrid/mail';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
const secretsManager = new SecretsManagerClient({ region: "us-east-1" });


// Initialize AWS SNS client and SendGrid
const snsClient = new SNSClient({ region: process.env.REGION });
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Lambda Handler
export const handler = async (event) => {
  console.log('Received SNS event:', JSON.stringify(event, null, 2));

  try {
    // Parse SNS message
     // Get SendGrid API key from environment variables
     const email_secret = process.env.EMAIL_SECRET_NAME;
     const secretResponse = await secretsManager.send(
       new GetSecretValueCommand({ SecretId: email_secret })
     );
     const credentials = JSON.parse(secretResponse.SecretString);
     const sendgridApiKey = credentials.sendgrid_api_key;
     const from_email = credentials.from_email;
     // const sendgridApiKey = process.env.SENDGRID_API_KEY;
     // const from_email = process.env.FROM_EMAIL;
 
     sgMail.setApiKey(sendgridApiKey);
 
    //  const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    //  const { email, verificationLink} = snsMessage;
    const snsMessage = event.Records[0].Sns.Message;
    const { email, token, first_name, last_name } = JSON.parse(snsMessage);

    console.log('Parsed SNS message:', { email, token, first_name, last_name });

    // Generate verification link
    // const verificationLink = `${process.env.WEBAPP_BASE_URL}/v1/user/verify?user=${email}&token=${encodeURIComponent(token)}`;
    const verificationLink = `${process.env.WEBAPP_BASE_URL}/v1/user/verify?user=${email}&token=${token}`;

    console.log('Generated verification link:', verificationLink);

    // Send verification email
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL, // Your verified sender email
      subject: 'Verify Your Account',
      text: `Hello ${first_name} ${last_name},\n\nPlease verify your account by clicking the link below:\n\n${verificationLink}\n\nThis link will expire in 2 minutes.\n\nThank you!`,
      html: `
        <p>Hello <strong>${first_name} ${last_name}</strong>,</p>
        <p>Please verify your account by clicking the link below:</p>
        <a href="${verificationLink}">Verify Your Account</a>
        <p>This link will expire in 2 minutes.</p>
        <p>Thank you!</p>
      `,
    };

    await sgMail.send(msg);
    console.log('Verification email sent successfully to:', email);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Verification email sent successfully.' }),
    };
  } catch (error) {
    console.error('Error processing SNS message:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error.', error: error.message }),
    };
  }
};
