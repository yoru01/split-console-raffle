import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
import { ask, yesno } from '@reach-sh/stdlib/ask.mjs';

const stdlib = loadStdlib({ REACH_NO_WARN: 'Y' });

const startingBalance = stdlib.parseCurrency(100);

const fmt = (x) => stdlib.formatCurrency(x, 4);

const acc  = await stdlib.newTestAccount(startingBalance);

console.log('Starting NFT Raffle Draw...');

const program = async () => {
  const isAlice = await ask(
    `Are You Alice`,
    yesno
  );

  const who = isAlice ? 'Alice' : 'Bob';
  console.log(`Starting as ${who}`);

  let ctc = null; 

  if (isAlice){ //if deployer
    console.log("Creating One of One NFT");
    const nft = await stdlib.launchToken(acc, "Pepe", "PP", {supply: stdlib.parseCurrency(1)});
    console.log("NFT created successfuly")

    // Defining Alice's interact interface
    const Alice = {
      nftParams: async () => {
        const numberOfTickets =  3; 
        return [nft.id, numberOfTickets];
      },

      luckyNumber: (n) => {
        const y = parseInt(n)
        console.log(y, "tickets have been created.");
        const luckyNumber =  Math.floor(Math.random() * n);
        console.log('The lucky number is', luckyNumber);
        return luckyNumber;
      },

      displayHash: (hashNo) => {
        console.log('The hash of the winning number is', hashNo);
      },

      showWinner: (address) => {
        console.log(address, 'has won this raffle draw.')
      },

      entries: (address, num) => {
        console.log( address, 'just submitted a draw of', fmt(num));
      },
    }
    
    ctc =  acc.contract(backend); 
    backend.Alice(ctc, {
      ...Alice,
      ...stdlib.hasRandom,
      seeNftBalance: async () => {
        console.log('Your NFT balance is ' + fmt(await stdlib.balanceOf(acc, nft.id)))
       }
    });
    const info = JSON.stringify(await ctc.getInfo()) 
    const getBalance = async () => fmt(await stdlib.balanceOf(acc, nft.id));
    const before =await getBalance()
    console.log('Your current balance is: ' + before)
    console.log('Contract Info: ', info);
  }
  else {
    const info = await ask(
      `Please paste the contract information of the contract you want to connect to:`, 
      JSON.parse
    );
    ctc = acc.contract(backend, info);

    console.log('Optining to NFT');
    const nftID = await ctc.apis.Bob.optintonft();
    await acc.tokenAccept(nftID);
    console.log('You have opted in to the nft successfully.')

    const ticketsAvailable = await ctc.apis.Bob.ticketsA();
    const y = parseInt(ticketsAvailable)
    console.log('Number of tickets available:', y);

    const num = (Math.floor(Math.random() * y));

    console.log('You picked the ticket with number', num);
    const x = await ctc.apis.Bob.getRaffle(num);
    console.log(x);
    if(x){
      console.log('You won')
    }
    else console.log('You did not win better luck next time')
  }
}

await program();
