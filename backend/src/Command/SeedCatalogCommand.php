<?php

declare(strict_types=1);

namespace App\Command;

use App\Catalog\Catalog;
use App\Entity\DbProductType;
use App\Entity\DbRateType;
use App\Entity\Offer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:catalog:seed',
    description: 'Replace the offers table with the Loan Checker catalog (same rows as prisma/offers.mjs).',
)]
final class SeedCatalogCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $connection = $this->entityManager->getConnection();
        try {
            $connection->executeStatement('DELETE FROM offers');
        } catch (\Throwable $exception) {
            $io->error('Could not write the offers table. On an empty database, run doctrine:migrations:migrate first. '.$exception->getMessage());

            return Command::FAILURE;
        }

        $this->entityManager->clear();
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        foreach (Catalog::rows() as $row) {
            $this->entityManager->persist(new Offer(
                id: $row['id'],
                partnerName: $row['partnerName'],
                logoUrl: $row['logoUrl'],
                productType: DbProductType::fromDomain($row['productType']),
                minAmountPln: $row['minAmountPln'],
                maxAmountPln: $row['maxAmountPln'],
                minPeriod: $row['minPeriod'],
                maxPeriod: $row['maxPeriod'],
                interestRateBps: $row['interestRateBps'],
                rateType: DbRateType::fromDomain($row['rateType']),
                commissionBps: $row['commissionBps'],
                fixedFeeGrosze: $row['fixedFeeGrosze'],
                affiliateUrl: $row['affiliateUrl'],
                active: $row['active'],
                createdAt: $now,
                updatedAt: $now,
            ));
        }
        $this->entityManager->flush();
        $io->success(sprintf('Replaced the catalog with %d offers.', \count(Catalog::rows())));

        return Command::SUCCESS;
    }
}
