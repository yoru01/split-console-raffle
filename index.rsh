'reach 0.1';
const [isOutcome, WIN, LOST] = makeEnum(2);

export const main = Reach.App(() => {
  setOptions({ untrustworthyMaps: false });
  const Alice = Participant('Alice', {
    nftParams: Fun([], Tuple(Token, UInt)),
    luckyNumber: Fun([UInt], UInt),
    displayHash: Fun([Digest], Null),
    showWinner: Fun([Address], Null),
    seeNftBalance:Fun([], Null),
    entries: Fun([Address, UInt], Null),
    ...hasRandom,
  });
  const Bob = API('Bob', {
    optintonft: Fun([], Token),
    getRaffle: Fun([UInt], Bool),
    ticketsA: Fun([], UInt),
  });
  init();

  Alice.only(() => {
    const [nft, numberOfTickets] = declassify(interact.nftParams());
    const _winningNumber = interact.luckyNumber(numberOfTickets);
    const [_commitAlice, _saltAlice ] = makeCommitment(interact, _winningNumber);
    const commitAlice = declassify(_commitAlice);
    interact.displayHash(commitAlice);
  })
  Alice.publish(nft, numberOfTickets, commitAlice);
  commit();

  Alice.pay([[1, nft]]);

  commit();

  Alice.publish();

  const entriesMap = new Map(Address, UInt);

  commit();

  Alice.only(() => {
    const luckyNumber = declassify(_winningNumber);
    const saltAlice = declassify(_saltAlice);
  });

  Alice.publish(saltAlice, luckyNumber);
  checkCommitment(commitAlice, saltAlice, luckyNumber);

  const [ counter, winner ] = 
    parallelReduce([ 0, Alice])
      .invariant( balance(nft) ==  balance(nft))
      .invariant(entriesMap.size() == counter)
      .while((counter < numberOfTickets))
      .api_(Bob.optintonft, () => {
        check(this != Alice, "Not deployer");

        return [0, (k) => {
          k(nft)

          return [counter, Alice]
        }]
      })
      .api_(Bob.ticketsA, () => {
        check(this != Alice, "Not deployer");

        return [0, (k) => {
          k(numberOfTickets)

          return [counter, Alice]
        }]
      })
      .api_(Bob.getRaffle, (num) => {
        check(this != Alice, "Not Deployer");
        check(isNone(entriesMap[this]), "Already made a draw")

        return [ 0, (k) => {
          
          entriesMap[this] = num;
          Alice.interact.entries(this, num);
          if (num == luckyNumber ){
            transfer(balance(nft), nft).to(this)
            Alice.interact.showWinner(this);
            k(true);
            return [counter + 1, this];
          }
          else {
            k(false);
            return [counter + 1, Alice];
          }
        }]
      })
      
  commit();
  Alice.publish();
  Alice.interact.seeNftBalance();
  transfer(balance(nft), nft).to(Alice);
  transfer(balance()).to(Alice);
  commit();
  exit();
});